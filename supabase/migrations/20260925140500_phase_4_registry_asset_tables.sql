-- Phase 4 public registries and asset metadata. Each exposed table enables RLS
-- and receives its policies in this migration.

create table public.content_domains (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_sr text not null,
  description_en text,
  description_sr text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_domains_slug_chk check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  constraint content_domains_name_en_chk check (char_length(name_en) between 1 and 120),
  constraint content_domains_name_sr_chk check (char_length(name_sr) between 1 and 120)
);
create index content_domains_status_sort_idx on public.content_domains(status, sort_order);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_sr text not null,
  description_en text,
  description_sr text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_slug_chk check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')
);
create index skills_status_sort_idx on public.skills(status, sort_order);

create table public.tool_definitions (
  id text primary key,
  category public.tool_category not null,
  label_en text not null,
  label_sr text not null,
  short_description_en text not null,
  short_description_sr text not null,
  explanation_en text,
  explanation_sr text,
  why_it_matters_en text,
  why_it_matters_sr text,
  common_mistakes_en text[] not null default '{}',
  common_mistakes_sr text[] not null default '{}',
  default_shortcut text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tool_definitions_id_chk check (id ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')
);
create index tool_definitions_category_status_idx on public.tool_definitions(category, status);

create table public.tool_object_roles (
  tool_id text not null references public.tool_definitions(id) on delete cascade,
  object_role public.cad_object_role not null,
  primary key (tool_id, object_role)
);
create index tool_object_roles_role_idx on public.tool_object_roles(object_role);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  scope public.asset_scope not null,
  visibility public.asset_visibility not null default 'private',
  owner_user_id uuid references auth.users(id) on delete cascade,
  kind public.asset_kind not null,
  bucket_id text not null,
  object_path text not null,
  original_filename text,
  mime_type text,
  byte_size bigint,
  sha256 text,
  status public.asset_status not null default 'uploading',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_bucket_path_key unique (bucket_id, object_path),
  constraint assets_owner_scope_chk check ((scope = 'user' and owner_user_id is not null) or scope = 'platform'),
  constraint assets_visibility_scope_chk check (scope = 'platform' or visibility = 'private'),
  constraint assets_bucket_scope_chk check (
    (scope = 'platform' and bucket_id in ('practice-assets', 'marketing-assets')) or
    (scope = 'user' and bucket_id in ('user-imports', 'case-geometry', 'screenshots'))
  ),
  constraint assets_byte_size_chk check (byte_size is null or byte_size >= 0),
  constraint assets_sha256_chk check (sha256 is null or sha256 ~ '^[A-Fa-f0-9]{64}$'),
  constraint assets_path_chk check (object_path <> '' and object_path !~ '(^/|//|(^|/)\.\.?(/|$))')
);
create index assets_owner_created_idx on public.assets(owner_user_id, created_at desc) where owner_user_id is not null;
create index assets_scope_visibility_status_idx on public.assets(scope, visibility, status);
create index assets_kind_status_idx on public.assets(kind, status);
create index assets_sha256_idx on public.assets(sha256) where sha256 is not null;

create table public.model_assets (
  asset_id uuid primary key references public.assets(id) on delete cascade,
  format public.model_format not null,
  default_role public.cad_object_role,
  source_unit public.model_unit not null default 'unknown',
  vertex_count bigint,
  triangle_count bigint,
  bbox_min double precision[],
  bbox_max double precision[],
  is_manifold boolean,
  has_normals boolean,
  original_to_canonical jsonb,
  technical_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint model_assets_vertex_count_chk check (vertex_count is null or vertex_count >= 0),
  constraint model_assets_triangle_count_chk check (triangle_count is null or triangle_count >= 0),
  constraint model_assets_bbox_min_chk check (bbox_min is null or array_length(bbox_min, 1) = 3),
  constraint model_assets_bbox_max_chk check (bbox_max is null or array_length(bbox_max, 1) = 3),
  constraint model_assets_transform_object_chk check (original_to_canonical is null or jsonb_typeof(original_to_canonical) = 'object'),
  constraint model_assets_metadata_object_chk check (jsonb_typeof(technical_metadata) = 'object')
);
create index model_assets_format_idx on public.model_assets(format);
create index model_assets_default_role_idx on public.model_assets(default_role);

create table public.asset_licenses (
  asset_id uuid primary key references public.assets(id) on delete cascade,
  license_name text,
  license_url text,
  source_url text,
  attribution_text text,
  commercial_use_allowed boolean,
  modification_allowed boolean,
  redistribution_allowed boolean,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  notes text
);

create trigger content_domains_set_updated_at before update on public.content_domains
for each row execute function public.set_updated_at();
create trigger skills_set_updated_at before update on public.skills
for each row execute function public.set_updated_at();
create trigger tool_definitions_set_updated_at before update on public.tool_definitions
for each row execute function public.set_updated_at();
create trigger assets_set_updated_at before update on public.assets
for each row execute function public.set_updated_at();

-- RLS is enabled in the same migration that creates every public application table.
alter table public.content_domains enable row level security;
alter table public.skills enable row level security;
alter table public.tool_definitions enable row level security;
alter table public.tool_object_roles enable row level security;
alter table public.assets enable row level security;
alter table public.model_assets enable row level security;
alter table public.asset_licenses enable row level security;

revoke all on table public.content_domains, public.skills, public.tool_definitions,
  public.tool_object_roles, public.assets, public.model_assets, public.asset_licenses
  from public, anon, authenticated;
grant select, insert, update, delete on table public.content_domains, public.skills,
  public.tool_definitions, public.tool_object_roles, public.assets, public.model_assets,
  public.asset_licenses to authenticated;

create policy content_domains_select_published_or_admin on public.content_domains
for select to authenticated using (status = 'published' or (select public.is_admin()));
create policy content_domains_insert_admin on public.content_domains
for insert to authenticated with check ((select public.is_admin()));
create policy content_domains_update_admin on public.content_domains
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy content_domains_delete_admin on public.content_domains
for delete to authenticated using ((select public.is_admin()));

create policy skills_select_published_or_admin on public.skills
for select to authenticated using (status = 'published' or (select public.is_admin()));
create policy skills_insert_admin on public.skills
for insert to authenticated with check ((select public.is_admin()));
create policy skills_update_admin on public.skills
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy skills_delete_admin on public.skills
for delete to authenticated using ((select public.is_admin()));

create policy tool_definitions_select_published_or_admin on public.tool_definitions
for select to authenticated using (status = 'published' or (select public.is_admin()));
create policy tool_definitions_insert_admin on public.tool_definitions
for insert to authenticated with check ((select public.is_admin()));
create policy tool_definitions_update_admin on public.tool_definitions
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy tool_definitions_delete_admin on public.tool_definitions
for delete to authenticated using ((select public.is_admin()));

create policy tool_object_roles_select_published_or_admin on public.tool_object_roles
for select to authenticated using (
  (select public.is_admin()) or exists (
    select 1 from public.tool_definitions td where td.id = tool_id and td.status = 'published'
  )
);
create policy tool_object_roles_insert_admin on public.tool_object_roles
for insert to authenticated with check ((select public.is_admin()));
create policy tool_object_roles_delete_admin on public.tool_object_roles
for delete to authenticated using ((select public.is_admin()));

create policy assets_select_authorized on public.assets
for select to authenticated using (
  (scope = 'user' and owner_user_id = (select auth.uid())) or
  (scope = 'platform' and visibility = 'authenticated' and status = 'ready') or
  (select public.is_admin())
);
create policy assets_insert_owner_or_admin on public.assets
for insert to authenticated with check (
  (select public.is_admin()) or
  (scope = 'user' and owner_user_id = (select auth.uid()) and visibility = 'private')
);
create policy assets_update_owner_or_admin on public.assets
for update to authenticated using (
  (scope = 'user' and owner_user_id = (select auth.uid())) or (select public.is_admin())
) with check (
  (select public.is_admin()) or
  (scope = 'user' and owner_user_id = (select auth.uid()) and visibility = 'private')
);
create policy assets_delete_owner_or_admin on public.assets
for delete to authenticated using (
  (scope = 'user' and owner_user_id = (select auth.uid())) or (select public.is_admin())
);

create policy model_assets_select_authorized_parent on public.model_assets
for select to authenticated using (exists (
  select 1 from public.assets a where a.id = asset_id and (
    (a.scope = 'user' and a.owner_user_id = (select auth.uid())) or
    (a.scope = 'platform' and a.visibility = 'authenticated' and a.status = 'ready') or
    (select public.is_admin())
  )
));
create policy model_assets_insert_owner_or_admin on public.model_assets
for insert to authenticated with check (exists (
  select 1 from public.assets a where a.id = asset_id and
    ((a.scope = 'user' and a.owner_user_id = (select auth.uid())) or (select public.is_admin()))
));
create policy model_assets_update_owner_or_admin on public.model_assets
for update to authenticated using (exists (
  select 1 from public.assets a where a.id = asset_id and
    ((a.scope = 'user' and a.owner_user_id = (select auth.uid())) or (select public.is_admin()))
)) with check (exists (
  select 1 from public.assets a where a.id = asset_id and
    ((a.scope = 'user' and a.owner_user_id = (select auth.uid())) or (select public.is_admin()))
));
create policy model_assets_delete_admin on public.model_assets
for delete to authenticated using ((select public.is_admin()));

create policy asset_licenses_select_authorized_parent on public.asset_licenses
for select to authenticated using (exists (
  select 1 from public.assets a where a.id = asset_id and (
    (a.scope = 'user' and a.owner_user_id = (select auth.uid())) or
    (a.scope = 'platform' and a.visibility = 'authenticated' and a.status = 'ready') or
    (select public.is_admin())
  )
));
create policy asset_licenses_insert_admin on public.asset_licenses
for insert to authenticated with check ((select public.is_admin()));
create policy asset_licenses_update_admin on public.asset_licenses
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy asset_licenses_delete_admin on public.asset_licenses
for delete to authenticated using ((select public.is_admin()));
