-- Admin writes use the existing is_admin() role helper; learners remain read-only.
grant select, insert, update, delete on public.practice_modules, public.practice_lessons,
  public.practice_steps, public.practice_hints, public.practice_step_tools,
  public.practice_step_validations, public.practice_lesson_skills, public.validation_configs
to authenticated;

create policy practice_modules_admin_write on public.practice_modules
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy practice_lessons_admin_write on public.practice_lessons
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy practice_steps_admin_write on public.practice_steps
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy practice_hints_admin_write on public.practice_hints
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy practice_step_tools_admin_write on public.practice_step_tools
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy practice_step_validations_admin_write on public.practice_step_validations
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy practice_lesson_skills_admin_write on public.practice_lesson_skills
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy validation_configs_read_published_or_admin on public.validation_configs
for select to authenticated using (status='published' or (select public.is_admin()));
create policy validation_configs_admin_write on public.validation_configs
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.publish_practice_lesson(p_lesson_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  lesson_row public.practice_lessons%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrative access required' using errcode='42501';
  end if;
  select * into lesson_row from public.practice_lessons where id=p_lesson_id for update;
  if not found then raise exception 'Lesson not found'; end if;
  if length(btrim(lesson_row.title_en))=0 or length(btrim(lesson_row.title_sr))=0
    or length(btrim(lesson_row.goal_en))=0 or length(btrim(lesson_row.goal_sr))=0 then
    raise exception 'Lesson title and goal are required in English and Serbian';
  end if;
  if not exists(select 1 from public.practice_steps where lesson_id=p_lesson_id and required) then
    raise exception 'Add at least one required lesson step before publishing';
  end if;
  if exists (
    select 1 from public.practice_steps s
    where s.lesson_id=p_lesson_id and (
      length(btrim(s.title_en))=0 or length(btrim(s.title_sr))=0 or
      length(btrim(s.instructions_en))=0 or length(btrim(s.instructions_sr))=0 or
      not exists(select 1 from public.practice_step_tools t where t.step_id=s.id)
    )
  ) then raise exception 'Every lesson step needs bilingual instructions and at least one registered tool'; end if;
  if exists (
    select 1 from public.practice_step_validations sv
    join public.validation_configs vc on vc.id=sv.validation_config_id
    where sv.step_id in (select id from public.practice_steps where lesson_id=p_lesson_id)
      and vc.validator_type not in ('transform_range','required_object')
  ) then raise exception 'A configured validator is not supported by the Practice runtime'; end if;
  if exists (
    select 1 from public.practice_lesson_assets la join public.assets a on a.id=la.asset_id
    left join public.asset_licenses al on al.asset_id=a.id
    where la.lesson_id=p_lesson_id and (a.status <> 'ready' or
      (a.scope='platform' and (al.asset_id is null or al.commercial_use_allowed is not true
        or (al.source_url is null and al.license_name is null))))
  ) then raise exception 'Referenced model assets must be ready and have reviewed provenance and commercial-use metadata'; end if;
  update public.practice_modules set status='published' where id=lesson_row.module_id;
  update public.practice_lessons set status='published' where id=p_lesson_id;
  perform public.record_admin_content_audit('publish','practice_lesson',p_lesson_id,'{}'::jsonb);
end; $$;
revoke all on function public.publish_practice_lesson(uuid) from public, anon;
grant execute on function public.publish_practice_lesson(uuid) to authenticated;

create or replace function public.publish_scenario(p_scenario_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare scenario_row public.scenarios%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrative access required' using errcode='42501';
  end if;
  select * into scenario_row from public.scenarios where id=p_scenario_id for update;
  if not found then raise exception 'Scenario not found'; end if;
  if length(btrim(scenario_row.title_en))=0 or length(btrim(scenario_row.title_sr))=0
    or length(btrim(coalesce(scenario_row.indication_en,'')))=0 or length(btrim(coalesce(scenario_row.indication_sr,'')))=0 then
    raise exception 'Scenario title and indication are required in English and Serbian';
  end if;
  if scenario_row.patient_code is null or scenario_row.patient_code !~ '^PT-[A-Z0-9-]+$' then
    raise exception 'Use a synthetic Patient ID in the form PT-0001';
  end if;
  if not exists(select 1 from public.content_domains d where d.id=scenario_row.domain_id and d.status='published') then
    raise exception 'Choose a published scenario category';
  end if;
  if cardinality(scenario_row.requirements_en)=0 or cardinality(scenario_row.requirements_sr)=0 then
    raise exception 'Add case brief requirements in both languages';
  end if;
  if exists (
    select 1 from public.scenario_assets sa join public.assets a on a.id=sa.asset_id
    left join public.asset_licenses al on al.asset_id=a.id
    where sa.scenario_id=p_scenario_id and (a.status <> 'ready' or a.scope <> 'platform' or
      al.asset_id is null or al.commercial_use_allowed is not true or
      (al.source_url is null and al.license_name is null))
  ) then raise exception 'Scenario assets must be ready platform models with reviewed commercial-use provenance'; end if;
  update public.scenarios set status='published', published_at=now() where id=p_scenario_id;
  perform public.record_admin_content_audit('publish','scenario',p_scenario_id,'{}'::jsonb);
end; $$;
revoke all on function public.publish_scenario(uuid) from public, anon;
grant execute on function public.publish_scenario(uuid) to authenticated;
