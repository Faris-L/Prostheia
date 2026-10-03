-- Align privileged platform-model and user-original upload limits with the
-- application's supported 128 MiB import size. Storage remains the authority
-- if a client bypasses the upload form.
update storage.buckets
set file_size_limit = 134217728
where id in ('practice-assets', 'user-imports');
