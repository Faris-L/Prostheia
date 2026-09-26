-- Enforce documented object path shape at the Storage API boundary as well as
-- in public.assets metadata. All user IDs in Storage are canonical UUID paths.

drop policy user_imports_read_owner_or_admin on storage.objects;
drop policy user_imports_insert_owner_or_admin on storage.objects;
drop policy user_imports_update_owner_or_admin on storage.objects;
drop policy user_imports_delete_owner_or_admin on storage.objects;

create policy user_imports_read_owner_or_admin on storage.objects
for select to authenticated using (
  bucket_id = 'user-imports' and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) <> ''
  and (((select auth.uid())::text = (storage.foldername(name))[1] and owner_id = (select auth.uid())::text)
    or (select public.is_admin()))
);
create policy user_imports_insert_owner_or_admin on storage.objects
for insert to authenticated with check (
  bucket_id = 'user-imports' and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) <> ''
  and (((select auth.uid())::text = (storage.foldername(name))[1] and owner_id = (select auth.uid())::text)
    or (select public.is_admin()))
);
create policy user_imports_update_owner_or_admin on storage.objects
for update to authenticated using (
  bucket_id = 'user-imports' and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) <> ''
  and (((select auth.uid())::text = (storage.foldername(name))[1] and owner_id = (select auth.uid())::text)
    or (select public.is_admin()))
) with check (
  bucket_id = 'user-imports' and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) <> ''
  and (((select auth.uid())::text = (storage.foldername(name))[1] and owner_id = (select auth.uid())::text)
    or (select public.is_admin()))
);
create policy user_imports_delete_owner_or_admin on storage.objects
for delete to authenticated using (
  bucket_id = 'user-imports' and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) <> ''
  and (((select auth.uid())::text = (storage.foldername(name))[1] and owner_id = (select auth.uid())::text)
    or (select public.is_admin()))
);

drop policy case_geometry_read_owner_or_admin on storage.objects;
drop policy case_geometry_insert_owner_or_admin on storage.objects;
drop policy case_geometry_delete_owner_or_admin on storage.objects;

create policy case_geometry_read_owner_or_admin on storage.objects
for select to authenticated using (
  bucket_id = 'case-geometry' and cardinality(storage.foldername(name)) = 3
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.glb$'
  and (((select auth.uid())::text = (storage.foldername(name))[1] and owner_id = (select auth.uid())::text)
    or (select public.is_admin()))
);
create policy case_geometry_insert_owner_or_admin on storage.objects
for insert to authenticated with check (
  bucket_id = 'case-geometry' and cardinality(storage.foldername(name)) = 3
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.glb$'
  and (((select auth.uid())::text = (storage.foldername(name))[1] and owner_id = (select auth.uid())::text)
    or (select public.is_admin()))
);
create policy case_geometry_delete_owner_or_admin on storage.objects
for delete to authenticated using (
  bucket_id = 'case-geometry' and cardinality(storage.foldername(name)) = 3
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.glb$'
  and (((select auth.uid())::text = (storage.foldername(name))[1] and owner_id = (select auth.uid())::text)
    or (select public.is_admin()))
);

drop policy screenshots_read_owner on storage.objects;
drop policy screenshots_insert_owner on storage.objects;
drop policy screenshots_delete_owner on storage.objects;

create policy screenshots_read_owner on storage.objects
for select to authenticated using (
  bucket_id = 'screenshots' and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and owner_id = (select auth.uid())::text
);
create policy screenshots_insert_owner on storage.objects
for insert to authenticated with check (
  bucket_id = 'screenshots' and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and owner_id = (select auth.uid())::text
);
create policy screenshots_delete_owner on storage.objects
for delete to authenticated using (
  bucket_id = 'screenshots' and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and owner_id = (select auth.uid())::text
);
