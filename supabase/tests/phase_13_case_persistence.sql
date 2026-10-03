-- Transactional integration checks for Phase 13. Run against a disposable/local
-- Supabase database with a role allowed to seed auth.users and storage.objects.
-- Every row is rolled back; no test account or geometry object is retained.
begin;

insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at,is_sso_user,is_anonymous)
values
  ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','phase13-a@example.invalid',now(),now(),now(),false,false),
  ('22222222-2222-4222-8222-222222222222','authenticated','authenticated','phase13-b@example.invalid',now(),now(),now(),false,false);
insert into public.user_cases(id,user_id,source_type,title)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','blank','RLS test A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','blank','RLS test B');
insert into public.case_revisions(id,case_id,revision_number,created_by)
values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'22222222-2222-4222-8222-222222222222');
insert into public.case_heads(case_id,revision_id)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
insert into storage.objects(id,bucket_id,name,owner_id,metadata,version)
values(
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','case-geometry',
  '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/ffffffff-ffff-4fff-8fff-ffffffffffff/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.glb',
  '11111111-1111-4111-8111-111111111111','{}','v1'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

do $$
declare v_count integer; v_result jsonb;
begin
  select count(*) into v_count from public.user_cases
    where id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  if v_count <> 1 then raise exception 'case RLS did not isolate owners'; end if;
  select count(*) into v_count from public.case_revisions
    where case_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if v_count <> 0 then raise exception 'revision RLS exposed another user'; end if;
  select count(*) into v_count from storage.objects where bucket_id='case-geometry' and name like '11111111-%';
  if v_count <> 1 then raise exception 'geometry owner could not read their private object'; end if;

  v_result := public.commit_case_revision('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','CAS test','blank','{}','{}','[]',null,null,null,null);
  if (v_result->>'revision_number')::integer <> 2 then raise exception 'CAS did not advance the head'; end if;
  begin
    perform public.commit_case_revision('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Stale write','blank','{}','{}','[]',null,null,null,null);
    raise exception 'stale head save unexpectedly succeeded';
  exception when sqlstate '40001' then null;
  end;

  begin
    insert into public.case_checkpoints(case_id,revision_id,user_id,name)
    values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111','foreign checkpoint test');
    raise exception 'cross-user checkpoint insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.commit_case_revision('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',null,'foreign write','blank','{}','{}','[]',null,null,null,null);
    raise exception 'cross-user case-head save unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.commit_case_revision(null,null,'foreign lineage','blank','{}','{}','[]','dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,null,null);
    raise exception 'foreign source revision lineage unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare v_count integer;
begin
  select count(*) into v_count from storage.objects where bucket_id='case-geometry' and name like '11111111-%';
  if v_count <> 0 then raise exception 'another authenticated user could read private geometry'; end if;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
declare v_count integer;
begin
  select count(*) into v_count from storage.objects where bucket_id='case-geometry';
  if v_count <> 0 then raise exception 'anonymous user could read private geometry'; end if;
end $$;
reset role;

rollback;
