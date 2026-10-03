-- Qualify checkpoint columns so the insert predicate compares the inserted row
-- against the owner's case head (and cannot be satisfied by a different case).
drop policy case_checkpoints_owner_insert on public.case_checkpoints;
create policy case_checkpoints_owner_insert on public.case_checkpoints
for insert to authenticated with check (
  case_checkpoints.user_id = (select auth.uid())
  and exists (
    select 1
    from public.case_heads as h
    join public.user_cases as c on c.id = h.case_id
    where h.case_id = case_checkpoints.case_id
      and h.revision_id = case_checkpoints.revision_id
      and c.user_id = (select auth.uid())
  )
);
