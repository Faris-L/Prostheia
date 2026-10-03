-- Phase 14: add only content relations absent from the deployed Phase 4/11 schema.
create table public.practice_lesson_assets (
  lesson_id uuid not null references public.practice_lessons(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete restrict,
  object_role public.cad_object_role not null,
  is_reference boolean not null default false,
  sort_order integer not null default 0,
  primary key (lesson_id, asset_id, object_role)
);
create index practice_lesson_assets_asset_idx on public.practice_lesson_assets(asset_id);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.content_domains(id) on delete restrict,
  slug text not null unique,
  difficulty public.difficulty_level not null,
  title_en text not null,
  title_sr text not null,
  description_en text,
  description_sr text,
  patient_code text,
  patient_age smallint,
  indication_en text,
  indication_sr text,
  tooth_numbers smallint[],
  requirements_en text[] not null default '{}',
  requirements_sr text[] not null default '{}',
  additional_metadata jsonb not null default '{}'::jsonb,
  random_eligible boolean not null default true,
  status public.content_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scenarios_slug_chk check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  constraint scenarios_patient_age_chk check (patient_age is null or patient_age between 0 and 120),
  constraint scenarios_metadata_object_chk check (jsonb_typeof(additional_metadata) = 'object'),
  constraint scenarios_published_at_chk check (status <> 'published' or published_at is not null)
);
create index scenarios_domain_difficulty_status_idx on public.scenarios(domain_id, difficulty, status);
create index scenarios_random_pool_idx on public.scenarios(domain_id, difficulty) where status = 'published' and random_eligible = true;

create table public.scenario_assets (
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete restrict,
  object_role public.cad_object_role not null,
  sort_order integer not null default 0,
  required boolean not null default true,
  primary key (scenario_id, asset_id, object_role)
);
create index scenario_assets_asset_idx on public.scenario_assets(asset_id);
create index scenario_assets_scenario_order_idx on public.scenario_assets(scenario_id, sort_order);

create table app_private.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action app_private.admin_audit_action not null,
  entity_type text not null check (entity_type in ('practice_module','practice_lesson','scenario','asset')),
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index admin_audit_log_entity_idx on app_private.admin_audit_log(entity_type, entity_id, created_at desc);
alter table app_private.admin_audit_log enable row level security;
revoke all on app_private.admin_audit_log from public, anon, authenticated;

create or replace function public.record_admin_content_audit(
  p_action app_private.admin_audit_action,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrative access required' using errcode = '42501';
  end if;
  if p_entity_type not in ('practice_module','practice_lesson','scenario','asset') then
    raise exception 'Unsupported audit entity type' using errcode = '22023';
  end if;
  insert into app_private.admin_audit_log(actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;
revoke all on function public.record_admin_content_audit(app_private.admin_audit_action,text,uuid,jsonb) from public, anon;
grant execute on function public.record_admin_content_audit(app_private.admin_audit_action,text,uuid,jsonb) to authenticated;

alter table public.practice_lesson_assets enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_assets enable row level security;
revoke all on public.practice_lesson_assets, public.scenarios, public.scenario_assets from public, anon, authenticated;
grant select, insert, update, delete on public.practice_lesson_assets, public.scenarios, public.scenario_assets to authenticated;

create policy practice_lesson_assets_read_published_or_admin on public.practice_lesson_assets
for select to authenticated using (
  (select public.is_admin()) or exists (
    select 1 from public.practice_lessons l join public.practice_modules m on m.id=l.module_id
    where l.id=lesson_id and l.status='published' and m.status='published'
  )
);
create policy practice_lesson_assets_write_admin on public.practice_lesson_assets
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy scenarios_read_published_or_admin on public.scenarios
for select to authenticated using (status='published' or (select public.is_admin()));
create policy scenarios_write_admin on public.scenarios
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy scenario_assets_read_published_or_admin on public.scenario_assets
for select to authenticated using (
  (select public.is_admin()) or exists (select 1 from public.scenarios s where s.id=scenario_id and s.status='published')
);
create policy scenario_assets_write_admin on public.scenario_assets
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create trigger scenarios_set_updated_at before update on public.scenarios
for each row execute function public.set_updated_at();
