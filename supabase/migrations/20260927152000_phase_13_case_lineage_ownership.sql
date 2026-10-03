-- A caller may choose source lineage metadata only within their own case data.
create or replace function public.enforce_case_lineage_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_user_id uuid;
  v_source_user_id uuid;
begin
  if tg_table_name = 'user_cases' then
    if new.duplicated_from_case_id is not null then
      select user_id into v_source_user_id from public.user_cases where id = new.duplicated_from_case_id;
      if v_source_user_id is distinct from new.user_id then
        raise exception 'duplicate_source_not_owned' using errcode = '42501';
      end if;
    end if;
  elsif tg_table_name = 'case_revisions' and new.source_revision_id is not null then
    select c.user_id into v_target_user_id from public.user_cases c where c.id = new.case_id;
    select c.user_id into v_source_user_id
      from public.case_revisions r join public.user_cases c on c.id = r.case_id
      where r.id = new.source_revision_id;
    if v_source_user_id is distinct from v_target_user_id then
      raise exception 'source_revision_not_owned' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_case_lineage_owner() from public, anon, authenticated;

create trigger user_cases_lineage_owner_chk
before insert or update of duplicated_from_case_id, user_id on public.user_cases
for each row execute function public.enforce_case_lineage_owner();
create trigger case_revisions_lineage_owner_chk
before insert or update of source_revision_id, case_id on public.case_revisions
for each row execute function public.enforce_case_lineage_owner();
