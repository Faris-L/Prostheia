-- Phase 23: screenshots are user-owned visual artifacts, independent of CAD revisions.
create table public.case_screenshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.user_cases(id) on delete cascade,
  revision_id uuid references public.case_revisions(id) on delete set null,
  asset_id uuid not null references public.assets(id) on delete restrict,
  camera_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint case_screenshots_camera_chk check (jsonb_typeof(camera_state) = 'object')
);

create index case_screenshots_case_created_idx on public.case_screenshots(case_id, created_at desc);
create index case_screenshots_user_idx on public.case_screenshots(user_id);

create table public.screenshot_annotations (
  id uuid primary key default gen_random_uuid(),
  screenshot_id uuid not null references public.case_screenshots(id) on delete cascade,
  annotation_type public.annotation_type not null,
  payload jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint screenshot_annotations_payload_chk check (jsonb_typeof(payload) = 'object')
);

create index screenshot_annotations_screenshot_order_idx on public.screenshot_annotations(screenshot_id, sort_order);
create trigger screenshot_annotations_set_updated_at before update on public.screenshot_annotations
for each row execute function public.set_updated_at();

alter table public.case_screenshots enable row level security;
alter table public.screenshot_annotations enable row level security;
revoke all on public.case_screenshots, public.screenshot_annotations from public, anon, authenticated;
grant select, insert, update, delete on public.case_screenshots, public.screenshot_annotations to authenticated;

create policy case_screenshots_owner_select on public.case_screenshots for select to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.user_cases c where c.id = case_id and c.user_id = (select auth.uid())));
create policy case_screenshots_owner_insert on public.case_screenshots for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.user_cases c where c.id = case_id and c.user_id = (select auth.uid())
) and (revision_id is null or exists (
  select 1 from public.case_revisions r where r.id = revision_id and r.case_id = case_id
)));
create policy case_screenshots_owner_update on public.case_screenshots for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy case_screenshots_owner_delete on public.case_screenshots for delete to authenticated
using (user_id = (select auth.uid()));

create policy screenshot_annotations_owner_select on public.screenshot_annotations for select to authenticated
using (exists (select 1 from public.case_screenshots s where s.id = screenshot_id and s.user_id = (select auth.uid())));
create policy screenshot_annotations_owner_insert on public.screenshot_annotations for insert to authenticated
with check (exists (select 1 from public.case_screenshots s where s.id = screenshot_id and s.user_id = (select auth.uid())));
create policy screenshot_annotations_owner_update on public.screenshot_annotations for update to authenticated
using (exists (select 1 from public.case_screenshots s where s.id = screenshot_id and s.user_id = (select auth.uid())))
with check (exists (select 1 from public.case_screenshots s where s.id = screenshot_id and s.user_id = (select auth.uid())));
create policy screenshot_annotations_owner_delete on public.screenshot_annotations for delete to authenticated
using (exists (select 1 from public.case_screenshots s where s.id = screenshot_id and s.user_id = (select auth.uid())));

comment on table public.case_screenshots is 'Private viewport image artifacts; not CAD geometry or revision objects.';
comment on table public.screenshot_annotations is 'Normalized 2D visual markup attached to a saved screenshot.';
