-- Phase 13: user-owned CAD cases and immutable revision history.
create table public.user_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type public.case_source_type not null,
  practice_lesson_id uuid references public.practice_lessons(id) on delete set null,
  scenario_id uuid,
  domain_id uuid references public.content_domains(id) on delete set null,
  title text not null,
  status public.case_status not null default 'in_progress',
  source_snapshot jsonb not null default '{}'::jsonb,
  duplicated_from_case_id uuid references public.user_cases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz,
  constraint user_cases_title_chk check (char_length(title) between 1 and 180),
  constraint user_cases_snapshot_object_chk check (jsonb_typeof(source_snapshot) = 'object'),
  constraint user_cases_source_shape_chk check (
    (source_type = 'practice' and practice_lesson_id is not null and scenario_id is null) or
    (source_type = 'scenario' and practice_lesson_id is null) or
    (source_type in ('import', 'blank') and practice_lesson_id is null and scenario_id is null)
  )
);
create index user_cases_user_updated_idx on public.user_cases(user_id, updated_at desc);
create index user_cases_user_status_idx on public.user_cases(user_id, status);
create trigger user_cases_set_updated_at before update on public.user_cases
for each row execute function public.set_updated_at();

create table public.case_objects (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.user_cases(id) on delete cascade,
  runtime_id text not null,
  role public.cad_object_role not null,
  name text not null,
  source_asset_id uuid references public.assets(id) on delete set null,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  constraint case_objects_name_chk check (char_length(name) between 1 and 160),
  constraint case_objects_runtime_key unique (case_id, runtime_id),
  constraint case_objects_case_id_id_key unique (case_id, id)
);
create index case_objects_case_idx on public.case_objects(case_id);
create index case_objects_case_role_idx on public.case_objects(case_id, role);

create table public.case_object_versions (
  id uuid primary key default gen_random_uuid(),
  case_object_id uuid not null references public.case_objects(id) on delete cascade,
  version_number integer not null,
  geometry_asset_id uuid not null references public.assets(id) on delete restrict,
  vertex_count bigint,
  triangle_count bigint,
  geometry_hash text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint case_object_versions_object_version_key unique (case_object_id, version_number),
  constraint case_object_versions_vertex_chk check (vertex_count is null or vertex_count >= 0),
  constraint case_object_versions_triangle_chk check (triangle_count is null or triangle_count >= 0),
  constraint case_object_versions_hash_chk check (geometry_hash is null or geometry_hash ~ '^[A-Fa-f0-9]{64}$')
);
create index case_object_versions_object_created_idx on public.case_object_versions(case_object_id, created_at desc);
create index case_object_versions_asset_idx on public.case_object_versions(geometry_asset_id);

create table public.case_revisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.user_cases(id) on delete cascade,
  revision_number integer not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  source_revision_id uuid references public.case_revisions(id) on delete set null,
  workspace_state jsonb not null default '{}'::jsonb,
  change_summary text,
  created_at timestamptz not null default now(),
  constraint case_revisions_case_number_key unique (case_id, revision_number),
  constraint case_revisions_case_id_id_key unique (case_id, id),
  constraint case_revisions_number_chk check (revision_number > 0),
  constraint case_revisions_workspace_object_chk check (jsonb_typeof(workspace_state) = 'object')
);
create index case_revisions_case_created_idx on public.case_revisions(case_id, created_at desc);
create index case_revisions_created_by_idx on public.case_revisions(created_by);

create table public.case_revision_objects (
  revision_id uuid not null references public.case_revisions(id) on delete cascade,
  case_object_id uuid not null references public.case_objects(id) on delete restrict,
  object_version_id uuid not null references public.case_object_versions(id) on delete restrict,
  position double precision[] not null default array[0.0, 0.0, 0.0],
  rotation_quaternion double precision[] not null default array[0.0, 0.0, 0.0, 1.0],
  scale double precision[] not null default array[1.0, 1.0, 1.0],
  visible boolean not null default true,
  object_state jsonb not null default '{}'::jsonb,
  primary key (revision_id, case_object_id),
  constraint case_revision_objects_position_chk check (array_length(position, 1) = 3),
  constraint case_revision_objects_rotation_chk check (array_length(rotation_quaternion, 1) = 4),
  constraint case_revision_objects_scale_chk check (array_length(scale, 1) = 3 and scale[1] > 0 and scale[2] > 0 and scale[3] > 0),
  constraint case_revision_objects_state_object_chk check (jsonb_typeof(object_state) = 'object')
);
create index case_revision_objects_object_idx on public.case_revision_objects(case_object_id);
create index case_revision_objects_version_idx on public.case_revision_objects(object_version_id);

create table public.case_heads (
  case_id uuid primary key references public.user_cases(id) on delete cascade,
  revision_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint case_heads_revision_fk foreign key (case_id, revision_id)
    references public.case_revisions(case_id, id) on delete cascade
);

create table public.case_checkpoints (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.user_cases(id) on delete cascade,
  revision_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint case_checkpoints_revision_fk foreign key (case_id, revision_id)
    references public.case_revisions(case_id, id) on delete cascade,
  constraint case_checkpoints_case_name_key unique (case_id, name),
  constraint case_checkpoints_name_chk check (char_length(name) between 1 and 120)
);
create index case_checkpoints_case_created_idx on public.case_checkpoints(case_id, created_at desc);
create index case_checkpoints_user_idx on public.case_checkpoints(user_id);

alter table public.user_cases enable row level security;
alter table public.case_objects enable row level security;
alter table public.case_object_versions enable row level security;
alter table public.case_revisions enable row level security;
alter table public.case_revision_objects enable row level security;
alter table public.case_heads enable row level security;
alter table public.case_checkpoints enable row level security;
revoke all on public.user_cases, public.case_objects, public.case_object_versions,
  public.case_revisions, public.case_revision_objects, public.case_heads, public.case_checkpoints
  from public, anon, authenticated;
grant select on public.user_cases, public.case_objects, public.case_object_versions,
  public.case_revisions, public.case_revision_objects, public.case_heads, public.case_checkpoints to authenticated;
grant update (last_opened_at) on public.user_cases to authenticated;
grant insert, delete on public.case_checkpoints to authenticated;

create policy user_cases_owner_select on public.user_cases for select to authenticated using (user_id = (select auth.uid()));
create policy user_cases_owner_touch on public.user_cases for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy case_objects_owner_select on public.case_objects for select to authenticated using (exists (select 1 from public.user_cases c where c.id = case_id and c.user_id = (select auth.uid())));
create policy case_object_versions_owner_select on public.case_object_versions for select to authenticated using (exists (select 1 from public.case_objects o join public.user_cases c on c.id = o.case_id where o.id = case_object_id and c.user_id = (select auth.uid())));
create policy case_revisions_owner_select on public.case_revisions for select to authenticated using (exists (select 1 from public.user_cases c where c.id = case_id and c.user_id = (select auth.uid())));
create policy case_revision_objects_owner_select on public.case_revision_objects for select to authenticated using (exists (select 1 from public.case_revisions r join public.user_cases c on c.id = r.case_id where r.id = revision_id and c.user_id = (select auth.uid())));
create policy case_heads_owner_select on public.case_heads for select to authenticated using (exists (select 1 from public.user_cases c where c.id = case_id and c.user_id = (select auth.uid())));
create policy case_checkpoints_owner_select on public.case_checkpoints for select to authenticated using (user_id = (select auth.uid()));
create policy case_checkpoints_owner_insert on public.case_checkpoints for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.case_heads h join public.user_cases c on c.id = h.case_id
    where h.case_id = case_id and h.revision_id = revision_id and c.user_id = (select auth.uid())
  )
);
create policy case_checkpoints_owner_delete on public.case_checkpoints for delete to authenticated using (user_id = (select auth.uid()));

-- This function is the only write path for case manifests and heads. Geometry bytes are uploaded
-- directly by the browser before commit; the function registers their immutable metadata and CASes
-- the head in one transaction. Uncommitted uploads remain identifiable by their asset/path rows.
create or replace function public.commit_case_revision(
  p_case_id uuid,
  p_expected_head_id uuid,
  p_title text,
  p_source_type public.case_source_type,
  p_source_snapshot jsonb,
  p_workspace_state jsonb,
  p_objects jsonb,
  p_source_revision_id uuid default null,
  p_duplicated_from_case_id uuid default null,
  p_scenario_id uuid default null,
  p_practice_lesson_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_case_id uuid := p_case_id;
  v_revision_id uuid := gen_random_uuid();
  v_revision_number integer;
  v_head_id uuid;
  v_object jsonb;
  v_case_object_id uuid;
  v_object_version_id uuid;
  v_asset_id uuid;
  v_version_number integer;
  v_runtime_id text;
  v_path text;
  v_bbox_min double precision[];
  v_bbox_max double precision[];
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 180 then raise exception 'invalid_case_title' using errcode = '22023'; end if;
  if jsonb_typeof(p_source_snapshot) <> 'object' or jsonb_typeof(p_workspace_state) <> 'object' or jsonb_typeof(p_objects) <> 'array' then raise exception 'invalid_revision_manifest' using errcode = '22023'; end if;

  if v_case_id is null then
    insert into public.user_cases (user_id, source_type, title, source_snapshot, duplicated_from_case_id, scenario_id, practice_lesson_id)
    values (v_user_id, p_source_type, btrim(p_title), p_source_snapshot, p_duplicated_from_case_id, p_scenario_id, p_practice_lesson_id)
    returning id into v_case_id;
  else
    perform 1 from public.user_cases where id = v_case_id and user_id = v_user_id for update;
    if not found then raise exception 'case_not_found' using errcode = '42501'; end if;
    select revision_id into v_head_id from public.case_heads where case_id = v_case_id;
    if v_head_id is distinct from p_expected_head_id then raise exception 'case_head_conflict' using errcode = '40001'; end if;
    if exists (select 1 from public.case_heads where case_id = v_case_id) then
      select revision_number + 1 into v_revision_number from public.case_revisions where id = v_head_id and case_id = v_case_id;
    else
      v_revision_number := 1;
    end if;
    update public.user_cases set title = btrim(p_title), updated_at = now() where id = v_case_id;
  end if;
  if v_revision_number is null then v_revision_number := 1; end if;

  insert into public.case_revisions (id, case_id, revision_number, created_by, source_revision_id, workspace_state)
  values (v_revision_id, v_case_id, v_revision_number, v_user_id, p_source_revision_id, p_workspace_state);

  for v_object in select value from jsonb_array_elements(p_objects) loop
    v_runtime_id := v_object->>'runtime_id';
    if v_runtime_id is null or char_length(v_runtime_id) not between 1 and 160 then raise exception 'invalid_object_identity' using errcode = '22023'; end if;
    insert into public.case_objects (id, case_id, runtime_id, role, name, source_asset_id)
    values ((v_object->>'case_object_id')::uuid, v_case_id, v_runtime_id, (v_object->>'role')::public.cad_object_role, left(coalesce(v_object->>'name','CAD Object'),160), nullif(v_object->>'source_asset_id','')::uuid)
    on conflict (case_id, runtime_id) do update set role = excluded.role, name = excluded.name, retired_at = null
    returning id into v_case_object_id;

    if v_object ? 'new_geometry' then
      v_asset_id := (v_object->'new_geometry'->>'asset_id')::uuid;
      v_path := v_object->'new_geometry'->>'object_path';
      if v_path !~ ('^' || v_user_id::text || '/' || v_case_id::text || '/' || v_case_object_id::text || '/' || (v_object->'new_geometry'->>'version_id') || '\.glb$') then raise exception 'invalid_geometry_storage_path' using errcode = '22023'; end if;
      if not exists (select 1 from storage.objects s where s.bucket_id = 'case-geometry' and s.name = v_path and s.owner_id = v_user_id::text) then raise exception 'geometry_upload_missing' using errcode = '22023'; end if;
      if nullif(v_object->>'source_asset_id','') is not null and not exists (select 1 from public.assets a where a.id = (v_object->>'source_asset_id')::uuid and a.owner_user_id = v_user_id and a.scope = 'user') then raise exception 'source_asset_not_owned' using errcode = '42501'; end if;
      if (v_object->'new_geometry'->>'byte_size')::bigint <= 0 then raise exception 'invalid_geometry_size' using errcode = '22023'; end if;
      insert into public.assets (id, scope, visibility, owner_user_id, kind, bucket_id, object_path, original_filename, mime_type, byte_size, sha256, status, created_by)
      values (v_asset_id, 'user', 'private', v_user_id, 'model', 'case-geometry', v_path, v_runtime_id || '.glb', 'model/gltf-binary', (v_object->'new_geometry'->>'byte_size')::bigint, v_object->'new_geometry'->>'sha256', 'ready', v_user_id);
      v_bbox_min := array[(v_object->'new_geometry'->'bounds_min'->>0)::float8,(v_object->'new_geometry'->'bounds_min'->>1)::float8,(v_object->'new_geometry'->'bounds_min'->>2)::float8];
      v_bbox_max := array[(v_object->'new_geometry'->'bounds_max'->>0)::float8,(v_object->'new_geometry'->'bounds_max'->>1)::float8,(v_object->'new_geometry'->'bounds_max'->>2)::float8];
      insert into public.model_assets (asset_id, format, default_role, source_unit, vertex_count, triangle_count, bbox_min, bbox_max, has_normals, technical_metadata)
      values (v_asset_id, 'glb', (v_object->>'role')::public.cad_object_role, 'mm', (v_object->'new_geometry'->>'vertex_count')::bigint, (v_object->'new_geometry'->>'triangle_count')::bigint, v_bbox_min, v_bbox_max, true, jsonb_build_object('snapshot','editable-geometry','schemaVersion',1));
      select coalesce(max(version_number),0)+1 into v_version_number from public.case_object_versions where case_object_id = v_case_object_id;
      insert into public.case_object_versions (id, case_object_id, version_number, geometry_asset_id, vertex_count, triangle_count, geometry_hash, created_by)
      values ((v_object->'new_geometry'->>'version_id')::uuid, v_case_object_id, v_version_number, v_asset_id, (v_object->'new_geometry'->>'vertex_count')::bigint, (v_object->'new_geometry'->>'triangle_count')::bigint, v_object->'new_geometry'->>'sha256', v_user_id)
      returning id into v_object_version_id;
    else
      v_object_version_id := (v_object->>'object_version_id')::uuid;
      if not exists (select 1 from public.case_object_versions where id = v_object_version_id and case_object_id = v_case_object_id) then raise exception 'geometry_version_mismatch' using errcode = '23503'; end if;
    end if;

    insert into public.case_revision_objects (revision_id, case_object_id, object_version_id, position, rotation_quaternion, scale, visible, object_state)
    values (
      v_revision_id, v_case_object_id, v_object_version_id,
      array[(v_object->'position'->>0)::float8,(v_object->'position'->>1)::float8,(v_object->'position'->>2)::float8],
      array[(v_object->'rotation_quaternion'->>0)::float8,(v_object->'rotation_quaternion'->>1)::float8,(v_object->'rotation_quaternion'->>2)::float8,(v_object->'rotation_quaternion'->>3)::float8],
      array[(v_object->'scale'->>0)::float8,(v_object->'scale'->>1)::float8,(v_object->'scale'->>2)::float8],
      coalesce((v_object->>'visible')::boolean,true), jsonb_build_object('opacity',coalesce((v_object->>'opacity')::float8,1.0),'runtimeId',v_runtime_id,'metadata',coalesce(v_object->'metadata','{}'::jsonb))
    );
  end loop;
  update public.case_objects set retired_at = now() where case_id = v_case_id and runtime_id not in (select value->>'runtime_id' from jsonb_array_elements(p_objects));
  insert into public.case_heads (case_id, revision_id) values (v_case_id, v_revision_id)
  on conflict (case_id) do update set revision_id = excluded.revision_id, updated_at = now();
  update public.user_cases set updated_at = now() where id = v_case_id;
  return jsonb_build_object('case_id',v_case_id,'revision_id',v_revision_id,'revision_number',v_revision_number);
end;
$$;
revoke all on function public.commit_case_revision(uuid,uuid,text,public.case_source_type,jsonb,jsonb,jsonb,uuid,uuid,uuid,uuid) from public, anon;
grant execute on function public.commit_case_revision(uuid,uuid,text,public.case_source_type,jsonb,jsonb,jsonb,uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.copy_case(p_source_case_id uuid, p_source_revision_id uuid, p_title text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid(); v_new_case_id uuid := gen_random_uuid(); v_new_revision_id uuid := gen_random_uuid(); v_revision_number integer; v_source public.user_cases%rowtype; v_row record; v_new_object_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_source from public.user_cases where id = p_source_case_id and user_id = v_user_id;
  if not found then raise exception 'case_not_found' using errcode = '42501'; end if;
  if char_length(btrim(p_title)) not between 1 and 180 then raise exception 'invalid_case_title' using errcode = '22023'; end if;
  select revision_number + 1 into v_revision_number from public.case_revisions where id = p_source_revision_id and case_id = p_source_case_id;
  if not found then raise exception 'revision_not_found' using errcode = '22023'; end if;
  insert into public.user_cases (id,user_id,source_type,practice_lesson_id,scenario_id,domain_id,title,status,source_snapshot,duplicated_from_case_id)
    values (v_new_case_id,v_user_id,v_source.source_type,v_source.practice_lesson_id,v_source.scenario_id,v_source.domain_id,btrim(p_title),'in_progress',v_source.source_snapshot,p_source_case_id);
  insert into public.case_revisions (id,case_id,revision_number,created_by,source_revision_id,workspace_state)
    select v_new_revision_id,v_new_case_id,1,v_user_id,p_source_revision_id,workspace_state from public.case_revisions where id = p_source_revision_id;
  for v_row in
    select o.runtime_id,o.role,o.name,o.source_asset_id,ro.position,ro.rotation_quaternion,ro.scale,ro.visible,ro.object_state,v.geometry_asset_id,v.vertex_count,v.triangle_count,v.geometry_hash,v.id old_version_id
    from public.case_revision_objects ro join public.case_objects o on o.id=ro.case_object_id
    join public.case_object_versions v on v.id=ro.object_version_id where ro.revision_id=p_source_revision_id
  loop
    insert into public.case_objects(case_id,runtime_id,role,name,source_asset_id) values(v_new_case_id,v_row.runtime_id,v_row.role,v_row.name,v_row.source_asset_id) returning id into v_new_object_id;
    insert into public.case_object_versions(case_object_id,version_number,geometry_asset_id,vertex_count,triangle_count,geometry_hash,created_by)
      values(v_new_object_id,1,v_row.geometry_asset_id,v_row.vertex_count,v_row.triangle_count,v_row.geometry_hash,v_user_id) returning id into v_row.old_version_id;
    insert into public.case_revision_objects(revision_id,case_object_id,object_version_id,position,rotation_quaternion,scale,visible,object_state)
      values(v_new_revision_id,v_new_object_id,v_row.old_version_id,v_row.position,v_row.rotation_quaternion,v_row.scale,v_row.visible,v_row.object_state);
  end loop;
  insert into public.case_heads(case_id,revision_id) values(v_new_case_id,v_new_revision_id);
  return jsonb_build_object('case_id',v_new_case_id,'revision_id',v_new_revision_id,'revision_number',1);
end;
$$;
revoke all on function public.copy_case(uuid,uuid,text) from public, anon;
grant execute on function public.copy_case(uuid,uuid,text) to authenticated;
