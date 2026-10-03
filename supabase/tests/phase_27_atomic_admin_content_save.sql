-- Transactional integration tests for the Phase 27 Admin save RPCs.
-- Run on a disposable/local Supabase database with permission to seed auth data.
-- The outer transaction rolls back all fixtures.
begin;

insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at,is_sso_user,is_anonymous)
values
  ('27770000-0000-4000-8000-000000000001','authenticated','authenticated','phase27-admin@example.invalid',now(),now(),now(),false,false),
  ('27770000-0000-4000-8000-000000000002','authenticated','authenticated','phase27-user@example.invalid',now(),now(),now(),false,false);
update app_private.user_roles set role='admin' where user_id='27770000-0000-4000-8000-000000000001';

insert into public.content_domains(id,slug,name_en,name_sr,status)
values ('27770000-0000-4000-8000-000000000010','phase27_test_domain','Phase 27 Test','Phase 27 test','published');
insert into public.practice_modules(id,slug,title_en,title_sr,status)
values ('27770000-0000-4000-8000-000000000011','phase27_test_module','Test module','Test modul','draft');
insert into public.practice_lessons(id,module_id,slug,difficulty,title_en,title_sr,summary_en,summary_sr,goal_en,goal_sr,estimated_minutes,case_setup,status)
values ('27770000-0000-4000-8000-000000000012','27770000-0000-4000-8000-000000000011','phase27_test_lesson','beginner','Original lesson','Originalna lekcija','Original summary','Originalni sažetak','Original goal','Originalni cilj',5,'{}','published');
insert into public.practice_steps(id,lesson_id,slug,sort_order,title_en,title_sr,instructions_en,instructions_sr,target_object_ids,reference_modes)
values ('27770000-0000-4000-8000-000000000013','27770000-0000-4000-8000-000000000012','original_step',10,'Original step','Originalni korak','Original instructions','Originalna uputstva','{crown}','{off}');
insert into public.practice_step_tools(step_id,tool_id) values ('27770000-0000-4000-8000-000000000013','move');
insert into public.practice_hints(id,step_id,slug,sort_order,title_en,title_sr,body_en,body_sr)
values ('27770000-0000-4000-8000-000000000014','27770000-0000-4000-8000-000000000013','original_hint',10,'Original hint','Originalni savet','Original body','Originalni tekst');
insert into public.validation_configs(id,slug,validator_type,config,status)
values ('27770000-0000-4000-8000-000000000015','phase27_test_lesson_original_step_target','required_step','{"type":"required_step"}','published');
insert into public.practice_step_validations(step_id,validation_config_id,sort_order)
values ('27770000-0000-4000-8000-000000000013','27770000-0000-4000-8000-000000000015',10);

insert into public.assets(id,scope,visibility,kind,bucket_id,object_path,original_filename,status,created_by)
values
 ('27770000-0000-4000-8000-000000000020','platform','authenticated','model','practice-assets','phase27/test-one.glb','test-one.glb','ready','27770000-0000-4000-8000-000000000001'),
 ('27770000-0000-4000-8000-000000000021','platform','authenticated','model','practice-assets','phase27/test-two.glb','test-two.glb','ready','27770000-0000-4000-8000-000000000001');
insert into public.practice_lesson_assets(lesson_id,asset_id,object_role,is_reference,sort_order)
values
 ('27770000-0000-4000-8000-000000000012','27770000-0000-4000-8000-000000000020','crown',false,10),
 ('27770000-0000-4000-8000-000000000012','27770000-0000-4000-8000-000000000021','reference',true,20);
insert into public.scenarios(id,domain_id,slug,difficulty,title_en,title_sr,description_en,description_sr,patient_code,indication_en,indication_sr,requirements_en,requirements_sr,additional_metadata,status,created_by)
values ('27770000-0000-4000-8000-000000000030','27770000-0000-4000-8000-000000000010','phase27_test_scenario','beginner','Original scenario','Originalni scenario','Original description','Originalni opis','PT-2700','Original indication','Originalna indikacija','{Original}','{Originalno}','{"synthetic":true,"notes":{"en":"old","sr":"staro"}}','published','27770000-0000-4000-8000-000000000001');
insert into public.scenario_assets(scenario_id,asset_id,object_role,required,sort_order)
values
 ('27770000-0000-4000-8000-000000000030','27770000-0000-4000-8000-000000000020','tooth',true,10),
 ('27770000-0000-4000-8000-000000000030','27770000-0000-4000-8000-000000000021','reference',false,20);

set local role authenticated;
select set_config('request.jwt.claim.sub','27770000-0000-4000-8000-000000000001',true);

do $$
declare
  v_payload jsonb;
  v_updated timestamptz;
  v_count integer;
  v_text text;
  v_order integer[];
begin
  select updated_at into v_updated from public.practice_lessons where id='27770000-0000-4000-8000-000000000012';
  v_payload := jsonb_build_object(
    'id','27770000-0000-4000-8000-000000000012','updatedAt',v_updated,'moduleId','27770000-0000-4000-8000-000000000011',
    'moduleSlug','phase27_test_module','moduleTitle',jsonb_build_object('en','Test module','sr','Test modul'),
    'moduleSummary',jsonb_build_object('en','','sr',''),'slug','phase27_test_lesson','difficulty','beginner','minutes',7,
    'title',jsonb_build_object('en','Changed lesson','sr','Izmenjena lekcija'),
    'summary',jsonb_build_object('en','Changed summary','sr','Izmenjen sažetak'),
    'goal',jsonb_build_object('en','Changed goal','sr','Izmenjen cilj'),
    'caseSetup',jsonb_build_object('source','shared-demo-workspace','objectMappings',jsonb_build_array()),
    'steps',jsonb_build_array(jsonb_build_object('id','27770000-0000-4000-8000-000000000016','slug','changed_step',
      'title',jsonb_build_object('en','Changed step','sr','Izmenjen korak'),
      'instructions',jsonb_build_object('en','Changed instructions','sr','Izmenjena uputstva'),
      'theory',jsonb_build_object('en','Theory','sr','Teorija'),'targets',jsonb_build_array('crown'),
      'tools',jsonb_build_array('move'),'referenceModes',jsonb_build_array('off'),'referencePosition',jsonb_build_array(0,0,0),
      'exampleMode','off','exampleLabel',jsonb_build_object('en','Example','sr','Primer'),'required',true,
      'hints',jsonb_build_array(jsonb_build_object('id','27770000-0000-4000-8000-000000000017','slug','changed_hint',
        'title',jsonb_build_object('en','Changed hint','sr','Izmenjen savet'),
        'body',jsonb_build_object('en','Changed body','sr','Izmenjen tekst'))),
      'validator',jsonb_build_object('type','required_step'))),
    'assets',jsonb_build_array(jsonb_build_object('assetId','27770000-0000-4000-8000-000000000020','role','reference','isReference',true),
      jsonb_build_object('assetId','27770000-0000-4000-8000-000000000021','role','crown','isReference',false)));

  -- Force the final child write (lesson asset FK) to fail after parent and steps changed.
  v_payload := jsonb_set(v_payload,'{assets,1,assetId}',to_jsonb('27770000-0000-4000-8000-000000000099'::text));
  begin
    perform public.save_admin_lesson(v_payload);
    raise exception 'Lesson rollback probe unexpectedly succeeded';
  exception when foreign_key_violation then null;
  end;
  select title_en into v_text from public.practice_lessons where id='27770000-0000-4000-8000-000000000012';
  if v_text <> 'Original lesson' then raise exception 'Lesson parent changed after failed transaction'; end if;
  select count(*) into v_count from public.practice_steps where lesson_id='27770000-0000-4000-8000-000000000012';
  if v_count <> 1 or not exists(select 1 from public.practice_steps where id='27770000-0000-4000-8000-000000000013' and title_en='Original step') then raise exception 'Lesson steps were not rolled back'; end if;
  if not exists(select 1 from public.practice_hints where id='27770000-0000-4000-8000-000000000014' and body_en='Original body') then raise exception 'Lesson hints were not rolled back'; end if;
  if not exists(select 1 from public.practice_step_validations where step_id='27770000-0000-4000-8000-000000000013' and validation_config_id='27770000-0000-4000-8000-000000000015') then raise exception 'Lesson validators were not rolled back'; end if;
  if (select count(*) from public.practice_lesson_assets where lesson_id='27770000-0000-4000-8000-000000000012') <> 2 then raise exception 'Lesson asset links were not rolled back'; end if;

  -- Success verifies the complete child graph, order, and bilingual fields update together.
  select updated_at into v_updated from public.practice_lessons where id='27770000-0000-4000-8000-000000000012';
  v_payload := jsonb_set(v_payload,'{assets,1,assetId}',to_jsonb('27770000-0000-4000-8000-000000000021'::text));
  v_payload := jsonb_set(v_payload,'{updatedAt}',to_jsonb(v_updated));
  perform public.save_admin_lesson(v_payload);
  if not exists(select 1 from public.practice_lessons where id='27770000-0000-4000-8000-000000000012' and title_en='Changed lesson' and title_sr='Izmenjena lekcija' and status='draft') then raise exception 'Lesson success did not save parent/draft state'; end if;
  if not exists(select 1 from public.practice_steps where id='27770000-0000-4000-8000-000000000016' and sort_order=10 and title_en='Changed step') then raise exception 'Lesson success did not save ordered step'; end if;
  if not exists(select 1 from public.practice_hints where id='27770000-0000-4000-8000-000000000017' and sort_order=10 and body_sr='Izmenjen tekst') then raise exception 'Lesson success did not save bilingual hint'; end if;
  if not exists(select 1 from public.practice_step_tools where step_id='27770000-0000-4000-8000-000000000016' and tool_id='move') then raise exception 'Lesson success did not save tool link'; end if;
  if not exists(select 1 from public.practice_step_validations sv join public.validation_configs vc on vc.id=sv.validation_config_id where sv.step_id='27770000-0000-4000-8000-000000000016' and vc.config->>'type'='required_step') then raise exception 'Lesson success did not save validator'; end if;
  select array_agg(sort_order order by sort_order) into v_order from public.practice_lesson_assets where lesson_id='27770000-0000-4000-8000-000000000012';
  if v_order <> array[10,20] then raise exception 'Lesson success lost asset ordering'; end if;

  select updated_at into v_updated from public.scenarios where id='27770000-0000-4000-8000-000000000030';
  v_payload := jsonb_build_object('id','27770000-0000-4000-8000-000000000030','updatedAt',v_updated,
    'domainId','27770000-0000-4000-8000-000000000010','slug','phase27_test_scenario','difficulty','beginner',
    'title',jsonb_build_object('en','Changed scenario','sr','Izmenjen scenario'),
    'description',jsonb_build_object('en','Changed description','sr','Izmenjen opis'),
    'patientCode','PT-2700','age',null,'indication',jsonb_build_object('en','Changed indication','sr','Izmenjena indikacija'),
    'toothNumbers',jsonb_build_array(11,12),'material',jsonb_build_object('en','Ceramic','sr','Keramika'),
    'requirements',jsonb_build_object('en',jsonb_build_array('New requirement'),'sr',jsonb_build_array('Novi zahtev')),
    'notes',jsonb_build_object('en','New notes','sr','Nove beleške'),'supplied',jsonb_build_object('en',jsonb_build_array('Scan'),'sr',jsonb_build_array('Snimak')),
    'randomEligible',true,'caseInitializer','implant','restorationType','crown',
    'assets',jsonb_build_array(jsonb_build_object('assetId','27770000-0000-4000-8000-000000000020','role','crown','required',true),
      jsonb_build_object('assetId','27770000-0000-4000-8000-000000000021','role','reference','required',false)));
  v_payload := jsonb_set(v_payload,'{assets,1,assetId}',to_jsonb('27770000-0000-4000-8000-000000000099'::text));
  begin
    perform public.save_admin_scenario(v_payload);
    raise exception 'Scenario rollback probe unexpectedly succeeded';
  exception when foreign_key_violation then null;
  end;
  if not exists(select 1 from public.scenarios where id='27770000-0000-4000-8000-000000000030' and title_en='Original scenario' and status='published') then raise exception 'Scenario parent changed after failed transaction'; end if;
  if (select count(*) from public.scenario_assets where scenario_id='27770000-0000-4000-8000-000000000030') <> 2 or not exists(select 1 from public.scenario_assets where scenario_id='27770000-0000-4000-8000-000000000030' and asset_id='27770000-0000-4000-8000-000000000020' and object_role='tooth' and sort_order=10) then raise exception 'Scenario assets were not rolled back'; end if;

  select updated_at into v_updated from public.scenarios where id='27770000-0000-4000-8000-000000000030';
  v_payload := jsonb_set(v_payload,'{assets,1,assetId}',to_jsonb('27770000-0000-4000-8000-000000000021'::text));
  v_payload := jsonb_set(v_payload,'{updatedAt}',to_jsonb(v_updated));
  perform public.save_admin_scenario(v_payload);
  if not exists(select 1 from public.scenarios where id='27770000-0000-4000-8000-000000000030' and title_en='Changed scenario' and title_sr='Izmenjen scenario' and status='draft' and additional_metadata->>'caseInitializer'='implant') then raise exception 'Scenario success did not save metadata/draft state'; end if;
  select array_agg(sort_order order by sort_order) into v_order from public.scenario_assets where scenario_id='27770000-0000-4000-8000-000000000030';
  if v_order <> array[10,20] then raise exception 'Scenario success lost asset ordering'; end if;
end $$;

-- A signed-in non-Admin can execute the specific RPC but RLS denies writes.
select set_config('request.jwt.claim.sub','27770000-0000-4000-8000-000000000002',true);
do $$
begin
  begin
    perform public.save_admin_scenario('{"domainId":"27770000-0000-4000-8000-000000000010","slug":"denied_user","difficulty":"beginner","title":{"en":"x","sr":"x"},"description":{"en":"x","sr":"x"},"indication":{"en":"x","sr":"x"},"toothNumbers":[],"requirements":{"en":[],"sr":[]},"material":{"en":"x","sr":"x"},"notes":{"en":"x","sr":"x"},"supplied":{"en":[],"sr":[]},"randomEligible":true,"assets":[]}');
    raise exception 'Authenticated non-Admin save unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_admin_lesson('{"moduleId":"27770000-0000-4000-8000-000000000011","moduleSlug":"phase27_test_module","moduleTitle":{"en":"Test module","sr":"Test modul"},"moduleSummary":{"en":"","sr":""},"slug":"phase27_denied_lesson","difficulty":"beginner","title":{"en":"x","sr":"x"},"summary":{"en":"x","sr":"x"},"goal":{"en":"x","sr":"x"},"minutes":5,"caseSetup":{"source":"shared-demo-workspace","objectMappings":[]},"steps":[],"assets":[]}');
    raise exception 'Authenticated non-Admin lesson save unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  begin
    perform public.save_admin_scenario('{}');
    raise exception 'Anonymous save unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_admin_lesson('{}');
    raise exception 'Anonymous lesson save unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

rollback;
