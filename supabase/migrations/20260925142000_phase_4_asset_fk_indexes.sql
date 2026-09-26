-- Keep foreign-key lookups efficient and satisfy the DB.md FK index rule.
create index assets_created_by_idx on public.assets(created_by) where created_by is not null;
create index asset_licenses_verified_by_idx on public.asset_licenses(verified_by) where verified_by is not null;
