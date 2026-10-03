-- Keep image type and upload size checks at the Storage boundary too.
update storage.buckets
set file_size_limit = 12582912, allowed_mime_types = array['image/webp']
where id = 'screenshots';

drop policy case_screenshots_owner_insert on public.case_screenshots;
create policy case_screenshots_owner_insert on public.case_screenshots for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.user_cases c where c.id = case_id and c.user_id = (select auth.uid())
) and exists (
  select 1 from public.assets a where a.id = asset_id and a.scope = 'user' and a.owner_user_id = (select auth.uid())
    and a.bucket_id = 'screenshots' and a.kind = 'screenshot'
) and (revision_id is null or exists (
  select 1 from public.case_revisions r where r.id = revision_id and r.case_id = case_id
)));

drop policy case_screenshots_owner_update on public.case_screenshots;
create policy case_screenshots_owner_update on public.case_screenshots for update to authenticated
using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.user_cases c where c.id = case_id and c.user_id = (select auth.uid())
  ) and exists (
    select 1 from public.assets a where a.id = asset_id and a.scope = 'user' and a.owner_user_id = (select auth.uid())
      and a.bucket_id = 'screenshots' and a.kind = 'screenshot'
  ) and (revision_id is null or exists (
    select 1 from public.case_revisions r where r.id = revision_id and r.case_id = case_id
  ))
);
