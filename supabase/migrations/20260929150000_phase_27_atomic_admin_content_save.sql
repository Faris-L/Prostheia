-- Phase 27: each Admin editor save replaces its full content graph atomically.
-- SECURITY INVOKER preserves the existing table grants and Admin RLS policies.

create or replace function public.save_admin_lesson(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_module_id uuid;
  v_lesson_id uuid;
  v_step jsonb;
  v_hint jsonb;
  v_config jsonb;
  v_config_id uuid;
  v_validator_slug text;
  v_index integer;
begin
  if pg_catalog.jsonb_typeof(p_payload) <> 'object'
    or pg_catalog.jsonb_typeof(p_payload->'steps') <> 'array'
    or pg_catalog.jsonb_typeof(p_payload->'assets') <> 'array' then
    raise exception 'Invalid lesson save payload' using errcode = '22023';
  end if;

  if nullif(p_payload->>'moduleId', '') is not null then
    v_module_id := (p_payload->>'moduleId')::uuid;
  else
    insert into public.practice_modules
      (slug, title_en, title_sr, summary_en, summary_sr, sort_order, status)
    values
      (p_payload->>'moduleSlug', p_payload->'moduleTitle'->>'en', p_payload->'moduleTitle'->>'sr',
       nullif(p_payload->'moduleSummary'->>'en', ''), nullif(p_payload->'moduleSummary'->>'sr', ''), 100, 'draft')
    returning id into v_module_id;
  end if;

  if nullif(p_payload->>'id', '') is not null then
    v_lesson_id := (p_payload->>'id')::uuid;
    update public.practice_lessons set
      module_id = v_module_id, slug = p_payload->>'slug', difficulty = (p_payload->>'difficulty')::public.difficulty_level,
      title_en = p_payload->'title'->>'en', title_sr = p_payload->'title'->>'sr',
      summary_en = p_payload->'summary'->>'en', summary_sr = p_payload->'summary'->>'sr',
      goal_en = p_payload->'goal'->>'en', goal_sr = p_payload->'goal'->>'sr',
      estimated_minutes = (p_payload->>'minutes')::integer, case_setup = p_payload->'caseSetup', status = 'draft'
    where id = v_lesson_id and updated_at = (p_payload->>'updatedAt')::timestamptz;
    if not found then
      raise exception 'Lesson changed after it was opened' using errcode = '40001';
    end if;
  else
    insert into public.practice_lessons
      (module_id, slug, difficulty, title_en, title_sr, summary_en, summary_sr, goal_en, goal_sr,
       estimated_minutes, case_setup, status, sort_order)
    values
      (v_module_id, p_payload->>'slug', (p_payload->>'difficulty')::public.difficulty_level,
       p_payload->'title'->>'en', p_payload->'title'->>'sr', p_payload->'summary'->>'en', p_payload->'summary'->>'sr',
       p_payload->'goal'->>'en', p_payload->'goal'->>'sr', (p_payload->>'minutes')::integer,
       p_payload->'caseSetup', 'draft', 100)
    returning id into v_lesson_id;
  end if;

  -- Deleting steps cascades tools, hints, and validation links in the same transaction.
  delete from public.practice_steps where lesson_id = v_lesson_id;
  v_index := 0;
  for v_step in select value from pg_catalog.jsonb_array_elements(p_payload->'steps') loop
    v_index := v_index + 1;
    insert into public.practice_steps
      (id, lesson_id, slug, sort_order, title_en, title_sr, instructions_en, instructions_sr, theory_en, theory_sr,
       target_object_ids, reference_modes, reference_config, example_config, required)
    values
      ((v_step->>'id')::uuid, v_lesson_id, v_step->>'slug', v_index * 10,
       v_step->'title'->>'en', v_step->'title'->>'sr', v_step->'instructions'->>'en', v_step->'instructions'->>'sr',
       nullif(v_step->'theory'->>'en', ''), nullif(v_step->'theory'->>'sr', ''),
       array(select jsonb_array_elements_text(v_step->'targets')),
       array(select jsonb_array_elements_text(v_step->'referenceModes')),
       case when nullif(v_step->>'referenceObjectId', '') is null then null
         else pg_catalog.jsonb_build_object('objectId', v_step->>'referenceObjectId', 'position', v_step->'referencePosition') end,
       case when v_step->>'exampleMode' = 'off' then null
         else pg_catalog.jsonb_build_object('label_en', v_step->'exampleLabel'->>'en', 'label_sr', v_step->'exampleLabel'->>'sr', 'mode', v_step->>'exampleMode') end,
       (v_step->>'required')::boolean);

    insert into public.practice_step_tools(step_id, tool_id)
    select (v_step->>'id')::uuid, jsonb_array_elements_text(v_step->'tools');

    v_index := 0;
    for v_hint in select value from pg_catalog.jsonb_array_elements(v_step->'hints') loop
      v_index := v_index + 1;
      insert into public.practice_hints
        (id, step_id, slug, sort_order, title_en, title_sr, body_en, body_sr)
      values ((v_hint->>'id')::uuid, (v_step->>'id')::uuid, v_hint->>'slug', v_index * 10,
        v_hint->'title'->>'en', v_hint->'title'->>'sr', v_hint->'body'->>'en', v_hint->'body'->>'sr');
    end loop;

    v_config := v_step->'validator';
    if v_config is not null and v_config <> 'null'::jsonb then
      v_validator_slug := pg_catalog.left(p_payload->>'slug' || '_' || v_step->>'slug' || '_target', 120);
      insert into public.validation_configs(slug, validator_type, config, status)
      values (v_validator_slug,
        case when v_config->>'type' in ('analysis_target','denture_setup','restorative_setup','implant_check')
          then 'custom'::public.validator_type else (v_config->>'type')::public.validator_type end,
        v_config, 'published')
      on conflict (slug) do update set validator_type = excluded.validator_type, config = excluded.config, status = 'published'
      returning id into v_config_id;
      insert into public.practice_step_validations(step_id, validation_config_id, sort_order)
      values ((v_step->>'id')::uuid, v_config_id, 10);
    end if;
  end loop;

  delete from public.practice_lesson_assets where lesson_id = v_lesson_id;
  insert into public.practice_lesson_assets(lesson_id, asset_id, object_role, is_reference, sort_order)
  select v_lesson_id, (asset->>'assetId')::uuid, (asset->>'role')::public.cad_object_role,
    (asset->>'isReference')::boolean, (ordinality::integer * 10)
  from pg_catalog.jsonb_array_elements(p_payload->'assets') with ordinality as items(asset, ordinality);

  return v_lesson_id;
end;
$$;

create or replace function public.save_admin_scenario(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_scenario_id uuid;
  v_asset jsonb;
  v_index integer := 0;
begin
  if pg_catalog.jsonb_typeof(p_payload) <> 'object'
    or pg_catalog.jsonb_typeof(p_payload->'assets') <> 'array' then
    raise exception 'Invalid scenario save payload' using errcode = '22023';
  end if;

  if nullif(p_payload->>'id', '') is not null then
    v_scenario_id := (p_payload->>'id')::uuid;
    update public.scenarios set
      domain_id = (p_payload->>'domainId')::uuid, slug = p_payload->>'slug',
      title_en = p_payload->'title'->>'en', title_sr = p_payload->'title'->>'sr',
      description_en = p_payload->'description'->>'en', description_sr = p_payload->'description'->>'sr',
      difficulty = (p_payload->>'difficulty')::public.difficulty_level,
      patient_code = nullif(p_payload->>'patientCode', ''), patient_age = (p_payload->>'age')::smallint,
      indication_en = p_payload->'indication'->>'en', indication_sr = p_payload->'indication'->>'sr',
      tooth_numbers = array(select jsonb_array_elements_text(p_payload->'toothNumbers')::smallint),
      requirements_en = array(select jsonb_array_elements_text(p_payload->'requirements'->'en')),
      requirements_sr = array(select jsonb_array_elements_text(p_payload->'requirements'->'sr')),
      additional_metadata = pg_catalog.jsonb_build_object('synthetic', true, 'material', p_payload->'material',
        'supplied', p_payload->'supplied', 'notes', p_payload->'notes', 'restorationType', p_payload->'restorationType',
        'caseInitializer', p_payload->'caseInitializer'),
      random_eligible = (p_payload->>'randomEligible')::boolean, status = 'draft'
    where id = v_scenario_id and updated_at = (p_payload->>'updatedAt')::timestamptz;
    if not found then
      raise exception 'Scenario changed after it was opened' using errcode = '40001';
    end if;
  else
    insert into public.scenarios
      (domain_id, slug, title_en, title_sr, description_en, description_sr, difficulty, patient_code, patient_age,
       indication_en, indication_sr, tooth_numbers, requirements_en, requirements_sr, additional_metadata,
       random_eligible, created_by, status)
    values
      ((p_payload->>'domainId')::uuid, p_payload->>'slug', p_payload->'title'->>'en', p_payload->'title'->>'sr',
       p_payload->'description'->>'en', p_payload->'description'->>'sr', (p_payload->>'difficulty')::public.difficulty_level,
       nullif(p_payload->>'patientCode', ''), (p_payload->>'age')::smallint,
       p_payload->'indication'->>'en', p_payload->'indication'->>'sr',
       array(select jsonb_array_elements_text(p_payload->'toothNumbers')::smallint),
       array(select jsonb_array_elements_text(p_payload->'requirements'->'en')),
       array(select jsonb_array_elements_text(p_payload->'requirements'->'sr')),
       pg_catalog.jsonb_build_object('synthetic', true, 'material', p_payload->'material', 'supplied', p_payload->'supplied',
         'notes', p_payload->'notes', 'restorationType', p_payload->'restorationType', 'caseInitializer', p_payload->'caseInitializer'),
       (p_payload->>'randomEligible')::boolean, auth.uid(), 'draft')
    returning id into v_scenario_id;
  end if;

  delete from public.scenario_assets where scenario_id = v_scenario_id;
  for v_asset in select value from pg_catalog.jsonb_array_elements(p_payload->'assets') loop
    v_index := v_index + 1;
    insert into public.scenario_assets(scenario_id, asset_id, object_role, required, sort_order)
    values (v_scenario_id, (v_asset->>'assetId')::uuid, (v_asset->>'role')::public.cad_object_role,
      (v_asset->>'required')::boolean, v_index * 10);
  end loop;

  return v_scenario_id;
end;
$$;

revoke all on function public.save_admin_lesson(jsonb) from public, anon;
revoke all on function public.save_admin_scenario(jsonb) from public, anon;
grant execute on function public.save_admin_lesson(jsonb) to authenticated;
grant execute on function public.save_admin_scenario(jsonb) to authenticated;
