-- Private-by-default buckets. Only intentionally public marketing media is public.
insert into storage.buckets (id, name, public)
values
  ('practice-assets', 'practice-assets', false),
  ('user-imports', 'user-imports', false),
  ('case-geometry', 'case-geometry', false),
  ('screenshots', 'screenshots', false),
  ('marketing-assets', 'marketing-assets', true)
on conflict (id) do update set name = excluded.name, public = excluded.public;

-- Keep asset metadata paths aligned with the documented per-bucket architecture.
alter table public.assets add constraint assets_bucket_path_shape_chk check (
  (bucket_id = 'user-imports' and object_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$') or
  (bucket_id = 'case-geometry' and object_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.glb$') or
  (bucket_id = 'screenshots' and object_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$') or
  (bucket_id in ('practice-assets', 'marketing-assets') and object_path <> '')
);

create policy user_roles_no_direct_access on app_private.user_roles
for all to anon, authenticated using (false) with check (false);

create policy practice_assets_read_published_or_admin on storage.objects
for select to authenticated using (
  bucket_id = 'practice-assets' and ((select public.is_admin()) or exists (
    select 1 from public.assets a where a.scope = 'platform' and a.visibility = 'authenticated'
      and a.status = 'ready' and a.bucket_id = storage.objects.bucket_id and a.object_path = storage.objects.name
  ))
);
create policy practice_assets_insert_admin on storage.objects
for insert to authenticated with check (bucket_id = 'practice-assets' and (select public.is_admin()));
create policy practice_assets_update_admin on storage.objects
for update to authenticated using (bucket_id = 'practice-assets' and (select public.is_admin()))
with check (bucket_id = 'practice-assets' and (select public.is_admin()));
create policy practice_assets_delete_admin on storage.objects
for delete to authenticated using (bucket_id = 'practice-assets' and (select public.is_admin()));

create policy user_imports_read_owner_or_admin on storage.objects
for select to authenticated using (
  bucket_id = 'user-imports' and (((select auth.uid())::text = (storage.foldername(name))[1]
    and owner_id = (select auth.uid())::text) or (select public.is_admin()))
);
create policy user_imports_insert_owner_or_admin on storage.objects
for insert to authenticated with check (
  bucket_id = 'user-imports' and (((select auth.uid())::text = (storage.foldername(name))[1]
    and owner_id = (select auth.uid())::text) or (select public.is_admin()))
);
create policy user_imports_update_owner_or_admin on storage.objects
for update to authenticated using (
  bucket_id = 'user-imports' and (((select auth.uid())::text = (storage.foldername(name))[1]
    and owner_id = (select auth.uid())::text) or (select public.is_admin()))
) with check (
  bucket_id = 'user-imports' and (((select auth.uid())::text = (storage.foldername(name))[1]
    and owner_id = (select auth.uid())::text) or (select public.is_admin()))
);
create policy user_imports_delete_owner_or_admin on storage.objects
for delete to authenticated using (
  bucket_id = 'user-imports' and (((select auth.uid())::text = (storage.foldername(name))[1]
    and owner_id = (select auth.uid())::text) or (select public.is_admin()))
);

-- Geometry versions are immutable: there is no UPDATE policy for case-geometry.
create policy case_geometry_read_owner_or_admin on storage.objects
for select to authenticated using (
  bucket_id = 'case-geometry' and (((select auth.uid())::text = (storage.foldername(name))[1]
    and owner_id = (select auth.uid())::text) or (select public.is_admin()))
);
create policy case_geometry_insert_owner_or_admin on storage.objects
for insert to authenticated with check (
  bucket_id = 'case-geometry' and (((select auth.uid())::text = (storage.foldername(name))[1]
    and owner_id = (select auth.uid())::text) or (select public.is_admin()))
);
create policy case_geometry_delete_owner_or_admin on storage.objects
for delete to authenticated using (
  bucket_id = 'case-geometry' and (((select auth.uid())::text = (storage.foldername(name))[1]
    and owner_id = (select auth.uid())::text) or (select public.is_admin()))
);

create policy screenshots_read_owner on storage.objects
for select to authenticated using (
  bucket_id = 'screenshots' and (select auth.uid())::text = (storage.foldername(name))[1]
  and owner_id = (select auth.uid())::text
);
create policy screenshots_insert_owner on storage.objects
for insert to authenticated with check (
  bucket_id = 'screenshots' and (select auth.uid())::text = (storage.foldername(name))[1]
  and owner_id = (select auth.uid())::text
);
create policy screenshots_delete_owner on storage.objects
for delete to authenticated using (
  bucket_id = 'screenshots' and (select auth.uid())::text = (storage.foldername(name))[1]
  and owner_id = (select auth.uid())::text
);

-- Public marketing URLs are readable; uploads and edits remain admin-only.
create policy marketing_assets_insert_admin on storage.objects
for insert to authenticated with check (bucket_id = 'marketing-assets' and (select public.is_admin()));
create policy marketing_assets_update_admin on storage.objects
for update to authenticated using (bucket_id = 'marketing-assets' and (select public.is_admin()))
with check (bucket_id = 'marketing-assets' and (select public.is_admin()));
create policy marketing_assets_delete_admin on storage.objects
for delete to authenticated using (bucket_id = 'marketing-assets' and (select public.is_admin()));
