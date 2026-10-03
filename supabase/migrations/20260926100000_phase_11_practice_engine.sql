-- Phase 11: structured bilingual Practice content and owner-scoped attempts.
create table public.practice_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_sr text not null,
  summary_en text,
  summary_sr text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.practice_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.practice_modules(id) on delete restrict,
  slug text not null unique,
  difficulty public.difficulty_level not null,
  title_en text not null,
  title_sr text not null,
  summary_en text not null,
  summary_sr text not null,
  goal_en text not null,
  goal_sr text not null,
  estimated_minutes integer not null,
  recommended_prerequisites jsonb not null default '[]'::jsonb,
  case_setup jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_lessons_minutes_chk check (estimated_minutes > 0),
  constraint practice_lessons_prerequisites_array_chk check (jsonb_typeof(recommended_prerequisites) = 'array'),
  constraint practice_lessons_case_setup_object_chk check (jsonb_typeof(case_setup) = 'object')
);
create index practice_lessons_module_order_idx on public.practice_lessons(module_id, sort_order);

create table public.practice_steps (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.practice_lessons(id) on delete cascade,
  slug text not null,
  sort_order integer not null,
  title_en text not null,
  title_sr text not null,
  instructions_en text not null,
  instructions_sr text not null,
  theory_en text,
  theory_sr text,
  target_object_ids text[] not null default '{}',
  reference_config jsonb,
  reference_modes text[] not null default '{}',
  example_config jsonb,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, slug),
  unique (lesson_id, sort_order),
  constraint practice_steps_example_object_chk check (example_config is null or jsonb_typeof(example_config) = 'object'),
  constraint practice_steps_reference_object_chk check (reference_config is null or jsonb_typeof(reference_config) = 'object')
);
create index practice_steps_lesson_order_idx on public.practice_steps(lesson_id, sort_order);

create table public.practice_hints (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.practice_steps(id) on delete cascade,
  slug text not null,
  sort_order integer not null,
  title_en text not null,
  title_sr text not null,
  body_en text not null,
  body_sr text not null,
  demo_asset_id uuid references public.assets(id) on delete set null,
  unique (step_id, slug),
  unique (step_id, sort_order)
);

create table public.practice_step_tools (
  step_id uuid not null references public.practice_steps(id) on delete cascade,
  tool_id text not null,
  primary key (step_id, tool_id)
);

create table public.validation_configs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  validator_type public.validator_type not null,
  config jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint validation_configs_config_object_chk check (jsonb_typeof(config) = 'object')
);

create table public.practice_step_validations (
  step_id uuid not null references public.practice_steps(id) on delete cascade,
  validation_config_id uuid not null references public.validation_configs(id) on delete restrict,
  sort_order integer not null default 0,
  primary key (step_id, validation_config_id),
  unique (step_id, sort_order)
);

create table public.practice_lesson_skills (
  lesson_id uuid not null references public.practice_lessons(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  primary key (lesson_id, skill_id)
);
create index practice_lesson_skills_skill_id_idx on public.practice_lesson_skills(skill_id);
create index practice_step_validations_validation_id_idx on public.practice_step_validations(validation_config_id);
create index practice_hints_demo_asset_id_idx on public.practice_hints(demo_asset_id) where demo_asset_id is not null;

create table public.practice_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.practice_lessons(id) on delete restrict,
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null,
  completed_at timestamptz,
  checks_count integer not null default 0,
  completed_step_ids text[] not null default '{}',
  score numeric(5,2),
  result_summary jsonb not null default '{}'::jsonb,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_attempts_checks_chk check (checks_count >= 0),
  constraint practice_attempts_score_chk check (score is null or score between 0 and 100),
  constraint practice_attempts_result_object_chk check (jsonb_typeof(result_summary) = 'object'),
  constraint practice_attempts_completion_chk check ((status = 'completed') = (completed_at is not null))
);
create index practice_attempts_user_activity_idx on public.practice_attempts(user_id, last_activity_at desc);
create index practice_attempts_lesson_idx on public.practice_attempts(lesson_id, user_id);

create table public.attempt_step_results (
  attempt_id uuid not null references public.practice_attempts(id) on delete cascade,
  step_slug text not null,
  status public.step_result_status not null,
  checks_count integer not null default 0,
  validation_results jsonb not null default '[]'::jsonb,
  geometry_fingerprint text,
  updated_at timestamptz not null default now(),
  primary key (attempt_id, step_slug),
  constraint attempt_step_results_checks_chk check (checks_count >= 0),
  constraint attempt_step_results_array_chk check (jsonb_typeof(validation_results) = 'array')
);

alter table public.skills enable row level security;
alter table public.practice_modules enable row level security;
alter table public.practice_lessons enable row level security;
alter table public.practice_steps enable row level security;
alter table public.practice_hints enable row level security;
alter table public.practice_step_tools enable row level security;
alter table public.validation_configs enable row level security;
alter table public.practice_step_validations enable row level security;
alter table public.practice_lesson_skills enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.attempt_step_results enable row level security;

create policy practice_modules_read_published on public.practice_modules for select to authenticated using (status = 'published');
create policy practice_lessons_read_published on public.practice_lessons for select to authenticated using (
  status = 'published' and exists (select 1 from public.practice_modules m where m.id = module_id and m.status = 'published')
);
create policy practice_steps_read_published on public.practice_steps for select to authenticated using (
  exists (select 1 from public.practice_lessons l join public.practice_modules m on m.id = l.module_id where l.id = lesson_id and l.status = 'published' and m.status = 'published')
);
create policy practice_hints_read_published on public.practice_hints for select to authenticated using (
  exists (select 1 from public.practice_steps s join public.practice_lessons l on l.id = s.lesson_id join public.practice_modules m on m.id = l.module_id where s.id = step_id and l.status = 'published' and m.status = 'published')
);
create policy practice_step_tools_read_published on public.practice_step_tools for select to authenticated using (
  exists (select 1 from public.practice_steps s join public.practice_lessons l on l.id = s.lesson_id join public.practice_modules m on m.id = l.module_id where s.id = step_id and l.status = 'published' and m.status = 'published')
);
create policy validation_configs_read_published on public.validation_configs for select to authenticated using (status = 'published');
create policy practice_step_validations_read_published on public.practice_step_validations for select to authenticated using (
  exists (select 1 from public.practice_steps s join public.practice_lessons l on l.id = s.lesson_id join public.practice_modules m on m.id = l.module_id where s.id = step_id and l.status = 'published' and m.status = 'published')
);
create policy practice_lesson_skills_read_published on public.practice_lesson_skills for select to authenticated using (
  exists (select 1 from public.practice_lessons l join public.practice_modules m on m.id = l.module_id where l.id = lesson_id and l.status = 'published' and m.status = 'published')
);
create policy practice_attempts_owner_read on public.practice_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy practice_attempts_owner_insert on public.practice_attempts for insert to authenticated with check (user_id = (select auth.uid()));
create policy practice_attempts_owner_update on public.practice_attempts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy attempt_step_results_owner_read on public.attempt_step_results for select to authenticated using (
  exists (select 1 from public.practice_attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
);
create policy attempt_step_results_owner_insert on public.attempt_step_results for insert to authenticated with check (
  exists (select 1 from public.practice_attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
);
create policy attempt_step_results_owner_update on public.attempt_step_results for update to authenticated using (
  exists (select 1 from public.practice_attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
) with check (exists (select 1 from public.practice_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));

grant select on public.skills, public.practice_modules, public.practice_lessons, public.practice_steps, public.practice_hints, public.practice_step_tools, public.validation_configs, public.practice_step_validations, public.practice_lesson_skills to authenticated;
grant select, insert, update on public.practice_attempts, public.attempt_step_results to authenticated;

insert into public.practice_modules (id, slug, title_en, title_sr, summary_en, summary_sr, sort_order, status)
values ('b7110000-0000-4000-8000-000000000011', 'cad-foundations', 'CAD foundations', 'CAD osnove', 'Navigation, selection and transforms in the shared workspace.', 'Navigacija, izbor i transformacije u zajedničkom radnom prostoru.', 1, 'published');
insert into public.practice_lessons (id, module_id, slug, difficulty, title_en, title_sr, summary_en, summary_sr, goal_en, goal_sr, estimated_minutes, case_setup, status)
values ('b7110000-0000-4000-8000-000000000001', 'b7110000-0000-4000-8000-000000000011', 'developer-move-and-position', 'foundation', 'Move and position an object', 'Pomeranje i pozicioniranje objekta', 'Use the shared CAD Move tool to place a demo restoration at two exercise targets.', 'Koristite zajednički CAD alat Move da postavite probnu restauraciju na dva cilja vežbe.', 'Practice object selection and precise movement in the CAD workspace.', 'Uvežbajte izbor objekta i precizno pomeranje u CAD radnom prostoru.', 3, '{"source":"shared-demo-workspace","objectMappings":[{"runtimeObjectId":"demo-prepared-tooth","semanticRole":"prepared_tooth","editable":true},{"runtimeObjectId":"demo-crown","semanticRole":"restoration","editable":true},{"runtimeObjectId":"demo-reference","semanticRole":"reference","editable":false}]}', 'published');
insert into public.practice_lesson_skills (lesson_id, skill_id)
select 'b7110000-0000-4000-8000-000000000001', id from public.skills where slug = 'object_manipulation';
insert into public.practice_steps (id, lesson_id, slug, sort_order, title_en, title_sr, instructions_en, instructions_sr, theory_en, theory_sr, target_object_ids, reference_config, reference_modes, example_config)
values
 ('b7110000-0000-4000-8000-000000000021', 'b7110000-0000-4000-8000-000000000001', 'position-restoration', 1, 'Move the restoration', 'Pomerite restauraciju', 'Select Demo restoration and move it so its X position is 0 mm. The other axes can stay where they are.', 'Izaberite Demo restoration i pomerite je tako da X pozicija bude 0 mm. Ostale ose mogu ostati nepromenjene.', 'Move changes an object’s position while preserving its shape. The Properties panel shows coordinates in millimetres.', 'Move menja položaj objekta, a njegov oblik ostaje isti. Panel Properties prikazuje koordinate u milimetrima.', array['demo-crown'], '{"objectId":"demo-reference","position":[0,0,0]}', array['off','outline','transparent','full'], '{"label_en":"Target outline","label_sr":"Kontura cilja","mode":"outline"}'),
 ('b7110000-0000-4000-8000-000000000022', 'b7110000-0000-4000-8000-000000000001', 'raise-restoration', 2, 'Adjust the height', 'Podesite visinu', 'Keep the restoration at X = 0 mm and set its Y position to 1 mm.', 'Zadržite restauraciju na X = 0 mm i postavite Y poziciju na 1 mm.', 'A step target is checked when you press Design Check. You can inspect or retry before continuing.', 'Cilj koraka proverava se kada pritisnete Design Check. Možete pregledati ili ponoviti korak pre nastavka.', array['demo-crown'], '{"objectId":"demo-reference","position":[0,1,0]}', array['off','outline','transparent'], null);
insert into public.practice_step_tools (step_id, tool_id) values
 ('b7110000-0000-4000-8000-000000000021','select'), ('b7110000-0000-4000-8000-000000000021','move'), ('b7110000-0000-4000-8000-000000000021','camera'),
 ('b7110000-0000-4000-8000-000000000022','select'), ('b7110000-0000-4000-8000-000000000022','move'), ('b7110000-0000-4000-8000-000000000022','camera');
insert into public.practice_hints (id, step_id, slug, sort_order, title_en, title_sr, body_en, body_sr) values
 ('b7110000-0000-4000-8000-000000000031','b7110000-0000-4000-8000-000000000021','find-object',1,'Find the object','Pronađite objekat','Choose Demo restoration in the Scene panel, then activate Move.','Izaberite Demo restoration u panelu Scene, zatim aktivirajte Move.'),
 ('b7110000-0000-4000-8000-000000000032','b7110000-0000-4000-8000-000000000021','check-x',2,'Check X','Proverite X','Set the X value in Properties to 0. The small step selector can help with fine movement.','U panelu Properties postavite X vrednost na 0. Mali korak pomeranja može pomoći pri preciznom pomeranju.'),
 ('b7110000-0000-4000-8000-000000000033','b7110000-0000-4000-8000-000000000022','height',1,'Use the Y field','Koristite polje Y','In Properties, set Y to 1. Keep the X coordinate at 0.','U panelu Properties postavite Y na 1. Zadržite X koordinatu na 0.');
insert into public.validation_configs (id, slug, validator_type, config, status) values
 ('b7110000-0000-4000-8000-000000000041','developer-position-x','transform_range','{"type":"transform_range","objectId":"demo-crown","position":[0,0,0],"axes":["x"],"toleranceMm":0.5}','published'),
 ('b7110000-0000-4000-8000-000000000042','developer-position-xy','transform_range','{"type":"transform_range","objectId":"demo-crown","position":[0,1,0],"axes":["x","y"],"toleranceMm":0.5}','published');
insert into public.practice_step_validations (step_id, validation_config_id, sort_order) values
 ('b7110000-0000-4000-8000-000000000021','b7110000-0000-4000-8000-000000000041',1),
 ('b7110000-0000-4000-8000-000000000022','b7110000-0000-4000-8000-000000000042',1);
