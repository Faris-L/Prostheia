# Prostheia — Database Architecture & Schema

> **Document:** `DB.md`  
> **Product:** Prostheia — Digital Dental Design Studio  
> **Source documents:** `plan.md`, `PRD.md`, `TECH.md`  
> **Database platform:** Supabase PostgreSQL  
> **Status:** Database design baseline

> This file is the planned architecture baseline, not a declaration that every
> listed object has been deployed. The deployed schema is defined by the
> timestamped files in `supabase/migrations/` and the live Supabase project.
> **Purpose:** Define the relational schema, enums, relationships, constraints, indexes, storage model, Row Level Security, database functions, and migration strategy required by Prostheia.

---

# 1. Database Design Goals

The Prostheia database must support:

- Supabase authentication;
- standard users and administrators;
- Serbian and English product content;
- Practice modules, lessons, steps and hints;
- contextual CAD tool education;
- Free Lab scenarios;
- reusable validation configurations;
- 3D asset metadata;
- licensing/provenance metadata for educational models;
- user-owned CAD cases;
- immutable CAD geometry revisions;
- project save revisions and named checkpoints;
- Practice attempts and Design Check results;
- skill-based progress;
- screenshots and screenshot annotations;
- educational material presets;
- admin content management;
- secure private Storage access;
- strict Row Level Security.

The database must **not** store large mesh vertex buffers directly in PostgreSQL.

Large binary geometry belongs in Supabase Storage.

PostgreSQL stores:

- ownership;
- relationships;
- metadata;
- workflow configuration;
- revision state;
- transform state;
- validation results;
- progress;
- Storage object references.

---

# 2. Core Database Principles

## 2.1 PostgreSQL is metadata/state; Storage is binary geometry

Do not store STL/GLB/OBJ/PLY bytes in `bytea` columns.

Use:

```text
PostgreSQL
├── projects
├── object identities
├── revisions
├── transforms
├── content
├── validation
└── asset metadata

Supabase Storage
├── STL
├── OBJ
├── PLY
├── GLB
├── screenshots
├── thumbnails
└── interactive-demo assets
```

---

## 2.2 User-generated data is private by default

User:

- imports;
- CAD geometry;
- saved revisions;
- screenshots;

must not be publicly accessible.

---

## 2.3 Published educational content is authenticated content

Practice models, references and scenario assets should remain controlled platform assets.

They can be readable by authenticated users when published without making their Storage buckets globally public.

---

## 2.4 Application role is not user-editable profile data

`admin` authorization must not live in a profile field the user can update.

Roles are stored separately in a protected schema/table.

---

## 2.5 Content is data-driven

Lessons and scenarios must not require a new React page for every exercise.

The database stores:

- steps;
- tool permissions;
- hints;
- assets;
- validators;
- difficulty;
- localized copy.

The application interprets this configuration.

---

## 2.6 Save revisions are immutable

A cloud Save creates an immutable project revision.

The project can point to a new current/head revision, but historical revisions are not edited in place.

---

## 2.7 Geometry assets are reused

A transform-only change must not require uploading the same mesh again.

Stable case objects point to immutable geometry versions.

Project revisions select:

- which geometry version is active;
- object transform;
- visibility;
- per-object revision metadata.

---

# 3. PostgreSQL Schemas

Use three relevant schemas.

```text
auth
public
app_private
```

## `auth`

Owned and managed by Supabase Auth.

Do not modify Supabase Auth tables.

Reference:

```text
auth.users(id)
```

only through supported primary keys.

---

## `public`

Contains application tables that may be reached through Supabase APIs.

Every application table in `public` must have RLS enabled.

---

## `app_private`

Contains security-sensitive internal data that does not need direct client API exposure.

Examples:

- user roles;
- admin audit logs.

Revoke direct access to this schema from `anon` and `authenticated`.

Expose only carefully designed security-definer helper functions where required.

---

# 4. Database Conventions

## 4.1 Primary keys

Use UUID primary keys unless a natural stable code is clearly preferable.

Default:

```sql
id uuid primary key default gen_random_uuid()
```

Code-defined registries such as CAD tools may use stable text IDs.

---

## 4.2 Time

Use:

```sql
timestamptz
```

for all timestamps.

PostgreSQL stores/normalizes timestamps correctly and the application renders in the user's timezone.

---

## 4.3 Naming

Tables:

```text
snake_case
plural
```

Columns:

```text
snake_case
```

Foreign keys:

```text
<entity>_id
```

Indexes:

```text
<table>_<columns>_idx
```

Unique constraints:

```text
<table>_<columns>_key
```

---

## 4.4 Mutable timestamps

Mutable tables should contain:

```sql
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Use one common trigger function to maintain `updated_at`.

---

## 4.5 Localized content

The product currently supports exactly:

- English;
- Serbian.

For product content, use explicit localized columns:

```text
title_en
title_sr
description_en
description_sr
```

This is intentionally simpler than a generic translation table.

If Prostheia later expands beyond these languages, migrate content into dedicated translation tables.

---

## 4.6 JSONB usage

JSONB is appropriate for:

- algorithm configuration;
- variable analysis payloads;
- scenario metadata;
- camera state;
- annotation geometry;
- settings that are not frequently queried relationally.

JSONB must **not** replace important relational ownership or foreign keys.

---

# 5. Enum Types

Create stable enums for values that are application-level finite states.

Do not use an enum for every dental category that may expand frequently.

---

## 5.1 `app_locale`

```sql
create type public.app_locale as enum (
  'en',
  'sr'
);
```

---

## 5.2 `app_theme`

```sql
create type public.app_theme as enum (
  'system',
  'light',
  'dark'
);
```

---

## 5.3 `app_role`

Defined in `app_private`:

```sql
create type app_private.app_role as enum (
  'user',
  'admin'
);
```

---

## 5.4 `content_status`

```sql
create type public.content_status as enum (
  'draft',
  'published',
  'archived'
);
```

---

## 5.5 `difficulty_level`

```sql
create type public.difficulty_level as enum (
  'foundation',
  'beginner',
  'intermediate',
  'advanced'
);
```

---

## 5.6 `reference_access_mode`

```sql
create type public.reference_access_mode as enum (
  'always',
  'after_first_attempt',
  'after_submission',
  'never'
);
```

---

## 5.7 `asset_scope`

```sql
create type public.asset_scope as enum (
  'platform',
  'user'
);
```

---

## 5.8 `asset_visibility`

```sql
create type public.asset_visibility as enum (
  'private',
  'authenticated'
);
```

`authenticated` means accessible to signed-in users when the associated content is intended to be distributed.

It does **not** mean a public internet file.

---

## 5.9 `asset_status`

```sql
create type public.asset_status as enum (
  'uploading',
  'processing',
  'ready',
  'failed',
  'archived'
);
```

---

## 5.10 `asset_kind`

```sql
create type public.asset_kind as enum (
  'model',
  'reference_model',
  'thumbnail',
  'tool_demo',
  'screenshot',
  'marketing',
  'other'
);
```

---

## 5.11 `model_format`

```sql
create type public.model_format as enum (
  'stl',
  'obj',
  'ply',
  'glb'
);
```

---

## 5.12 `model_unit`

```sql
create type public.model_unit as enum (
  'mm',
  'cm',
  'm',
  'unknown'
);
```

Canonical Prostheia workspace geometry is normalized to millimetres.

---

## 5.13 `cad_object_role`

```sql
create type public.cad_object_role as enum (
  'maxilla',
  'mandible',
  'antagonist',
  'preop',
  'prepared_tooth',
  'tooth',
  'crown',
  'bridge',
  'pontic',
  'denture_tooth',
  'denture_base',
  'framework',
  'splint',
  'implant',
  'abutment',
  'model_base',
  'reference',
  'scan',
  'other'
);
```

Adding a new value should correspond to a code-level capability review because object role affects available CAD tools.

---

## 5.14 `tool_category`

```sql
create type public.tool_category as enum (
  'navigation',
  'scene',
  'transform',
  'mesh',
  'sculpt',
  'curve',
  'analysis',
  'occlusion',
  'workflow',
  'export'
);
```

---

## 5.15 `demo_kind`

```sql
create type public.demo_kind as enum (
  'interactive_3d',
  'animation',
  'image'
);
```

Interactive 3D is preferred where practical.

---

## 5.16 `validator_type`

```sql
create type public.validator_type as enum (
  'required_object',
  'required_step',
  'transform_range',
  'no_intersection',
  'max_deviation',
  'contact_range',
  'thickness_range',
  'margin_complete',
  'custom'
);
```

`custom` must not allow arbitrary SQL or JavaScript.

It references a code-defined validator identifier inside configuration.

---

## 5.17 `validation_severity`

```sql
create type public.validation_severity as enum (
  'info',
  'warning',
  'error'
);
```

---

## 5.18 `validation_outcome`

```sql
create type public.validation_outcome as enum (
  'pass',
  'warning',
  'fail',
  'not_applicable'
);
```

---

## 5.19 `verification_status`

Used for domain-sensitive educational values.

```sql
create type public.verification_status as enum (
  'unverified',
  'source_reviewed',
  'expert_verified'
);
```

---

## 5.20 `case_source_type`

```sql
create type public.case_source_type as enum (
  'practice',
  'scenario',
  'import',
  'blank'
);
```

---

## 5.21 `case_status`

```sql
create type public.case_status as enum (
  'draft',
  'in_progress',
  'completed',
  'archived'
);
```

---

## 5.22 `attempt_status`

```sql
create type public.attempt_status as enum (
  'in_progress',
  'completed',
  'abandoned'
);
```

---

## 5.23 `step_result_status`

```sql
create type public.step_result_status as enum (
  'not_started',
  'in_progress',
  'passed',
  'failed'
);
```

---

## 5.24 `annotation_type`

```sql
create type public.annotation_type as enum (
  'arrow',
  'circle',
  'text',
  'highlight'
);
```

---

## 5.25 `domain_reference_type`

```sql
create type public.domain_reference_type as enum (
  'official_documentation',
  'textbook',
  'journal',
  'course_material',
  'expert_review',
  'other'
);
```

---

## 5.26 `admin_audit_action`

Defined in `app_private`:

```sql
create type app_private.admin_audit_action as enum (
  'create',
  'update',
  'publish',
  'archive',
  'delete',
  'restore'
);
```

---

# 6. Security Helper Functions

---

## 6.1 `is_admin()`

Create a stable security-definer function:

```sql
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'admin'::app_private.app_role
  );
$$;
```

Permissions:

```sql
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
```

Never decide administrative authorization from client UI state.

---

# 7. Common Timestamp Trigger

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

Attach to mutable tables.

---

# 8. Identity Tables

---

# 8.1 `public.profiles`

Application profile associated 1:1 with Supabase Auth.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  display_name text,
  locale public.app_locale not null default 'sr',
  theme public.app_theme not null default 'system',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_length_chk
    check (display_name is null or char_length(display_name) between 1 and 100)
);
```

Relationship:

```text
auth.users 1 ─── 1 profiles
```

Index:

Primary key is sufficient for normal profile lookup.

RLS:

- user can SELECT own profile;
- user can UPDATE own profile;
- admin can SELECT profiles if required;
- client does not INSERT arbitrary profile IDs.

---

# 8.2 `app_private.user_roles`

```sql
create table app_private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,

  role app_private.app_role not null default 'user',

  granted_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Relationship:

```text
auth.users 1 ─── 1 user_roles
```

Direct access:

```text
anon          → none
authenticated → none
```

Role changes must occur through trusted server/admin operations.

---

# 8.3 New User Trigger

Create both profile and default role after signup.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  insert into app_private.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;
```

Trigger:

```sql
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

This function must be covered by database tests because a failing auth trigger can block signup.

---

# 9. Content Domain Tables

Dental domains should be data-driven rather than PostgreSQL enums so additional modules can be introduced without enum migrations.

---

# 9.1 `public.content_domains`

Examples:

```text
cad_foundations
scan_model
sculpting
crown
bridge
inlay_onlay
veneer
complete_denture
partial_denture
bite_splint
digital_model
implant
```

Schema:

```sql
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

  constraint content_domains_slug_chk
    check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),

  constraint content_domains_name_en_chk
    check (char_length(name_en) between 1 and 120),

  constraint content_domains_name_sr_chk
    check (char_length(name_sr) between 1 and 120)
);
```

Indexes:

```sql
create index content_domains_status_sort_idx
  on public.content_domains(status, sort_order);
```

---

# 10. Skill Model

---

# 10.1 `public.skills`

```sql
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

  constraint skills_slug_chk
    check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')
);
```

Examples:

```text
cad_navigation
sculpting
scan_preparation
crown
bridge
complete_denture
partial_denture
occlusion
surveying
digital_models
splints
implants
```

Indexes:

```sql
create index skills_status_sort_idx
  on public.skills(status, sort_order);
```

---

# 11. Practice Curriculum Tables

---

# 11.1 `public.practice_modules`

```sql
create table public.practice_modules (
  id uuid primary key default gen_random_uuid(),

  domain_id uuid not null
    references public.content_domains(id)
    on delete restrict,

  slug text not null unique,

  title_en text not null,
  title_sr text not null,

  description_en text,
  description_sr text,

  sort_order integer not null default 0,
  status public.content_status not null default 'draft',

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint practice_modules_slug_chk
    check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),

  constraint practice_modules_published_at_chk
    check (
      status <> 'published'
      or published_at is not null
    )
);
```

Indexes:

```sql
create index practice_modules_domain_status_idx
  on public.practice_modules(domain_id, status, sort_order);
```

---

# 11.2 `public.practice_lessons`

```sql
create table public.practice_lessons (
  id uuid primary key default gen_random_uuid(),

  module_id uuid not null
    references public.practice_modules(id)
    on delete cascade,

  slug text not null,

  difficulty public.difficulty_level not null,

  title_en text not null,
  title_sr text not null,

  description_en text,
  description_sr text,

  goal_en text not null,
  goal_sr text not null,

  estimated_minutes smallint,

  reference_access public.reference_access_mode not null default 'always',

  score_enabled boolean not null default true,

  sort_order integer not null default 0,

  status public.content_status not null default 'draft',

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint practice_lessons_module_slug_key
    unique (module_id, slug),

  constraint practice_lessons_slug_chk
    check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),

  constraint practice_lessons_minutes_chk
    check (estimated_minutes is null or estimated_minutes between 1 and 600),

  constraint practice_lessons_published_at_chk
    check (
      status <> 'published'
      or published_at is not null
    )
);
```

Indexes:

```sql
create index practice_lessons_module_status_sort_idx
  on public.practice_lessons(module_id, status, sort_order);

create index practice_lessons_difficulty_status_idx
  on public.practice_lessons(difficulty, status);
```

---

# 11.3 `public.lesson_prerequisites`

Prerequisites are advisory at entry level.

```sql
create table public.lesson_prerequisites (
  lesson_id uuid not null
    references public.practice_lessons(id)
    on delete cascade,

  prerequisite_lesson_id uuid not null
    references public.practice_lessons(id)
    on delete cascade,

  sort_order integer not null default 0,

  primary key (lesson_id, prerequisite_lesson_id),

  constraint lesson_prerequisites_not_self_chk
    check (lesson_id <> prerequisite_lesson_id)
);
```

Indexes:

```sql
create index lesson_prerequisites_prerequisite_idx
  on public.lesson_prerequisites(prerequisite_lesson_id);
```

Cycles should be prevented in admin/business validation.

A recursive database cycle constraint is optional and not required for MVP.

---

# 11.4 `public.practice_lesson_skills`

Links a lesson to the skills it contributes toward.

```sql
create table public.practice_lesson_skills (
  lesson_id uuid not null
    references public.practice_lessons(id)
    on delete cascade,

  skill_id uuid not null
    references public.skills(id)
    on delete cascade,

  weight numeric(6,3) not null default 1,

  primary key (lesson_id, skill_id),

  constraint practice_lesson_skills_weight_chk
    check (weight > 0)
);
```

Indexes:

```sql
create index practice_lesson_skills_skill_idx
  on public.practice_lesson_skills(skill_id);
```

---

# 11.5 `public.practice_steps`

```sql
create table public.practice_steps (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null
    references public.practice_lessons(id)
    on delete cascade,

  step_number integer not null,

  title_en text not null,
  title_sr text not null,

  instructions_en text not null,
  instructions_sr text not null,

  required boolean not null default true,

  reference_access_override public.reference_access_mode,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint practice_steps_lesson_number_key
    unique (lesson_id, step_number),

  constraint practice_steps_number_chk
    check (step_number > 0)
);
```

Indexes:

```sql
create index practice_steps_lesson_idx
  on public.practice_steps(lesson_id, step_number);
```

Business rule:

Current guided Practice content uses `required = true`.

The column exists to preserve future flexibility.

---

# 12. CAD Tool Registry

---

# 12.1 `public.tool_definitions`

Tool IDs are stable code-defined identifiers.

Examples:

```text
select
move
rotate
scale
trim
delete_region
fill_hole
smooth
sculpt_add
sculpt_remove
sculpt_smooth
sculpt_flatten
sculpt_morph
margin
measure_distance
section
contacts
thickness
undercut
occlusion
```

Schema:

```sql
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

  constraint tool_definitions_id_chk
    check (id ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')
);
```

Indexes:

```sql
create index tool_definitions_category_status_idx
  on public.tool_definitions(category, status);
```

---

# 12.2 `public.tool_object_roles`

Defines which object roles a tool can conceptually operate on.

```sql
create table public.tool_object_roles (
  tool_id text not null
    references public.tool_definitions(id)
    on delete cascade,

  object_role public.cad_object_role not null,

  primary key (tool_id, object_role)
);
```

Index:

```sql
create index tool_object_roles_role_idx
  on public.tool_object_roles(object_role);
```

---

# 12.3 `public.practice_step_tools`

Rows form the allowed-tool set for a Practice step.

```sql
create table public.practice_step_tools (
  step_id uuid not null
    references public.practice_steps(id)
    on delete cascade,

  tool_id text not null
    references public.tool_definitions(id)
    on delete cascade,

  primary key (step_id, tool_id)
);
```

Index:

```sql
create index practice_step_tools_tool_idx
  on public.practice_step_tools(tool_id);
```

If a Practice step has tool restrictions, only rows in this table are enabled in addition to base applicability checks.

---

# 12.4 `public.practice_hints`

```sql
create table public.practice_hints (
  id uuid primary key default gen_random_uuid(),

  step_id uuid not null
    references public.practice_steps(id)
    on delete cascade,

  hint_order integer not null,

  content_en text not null,
  content_sr text not null,

  demo_asset_id uuid,

  created_at timestamptz not null default now(),

  constraint practice_hints_step_order_key
    unique (step_id, hint_order),

  constraint practice_hints_order_chk
    check (hint_order > 0)
);
```

`demo_asset_id` FK is added after the assets table exists.

---

# 13. Domain Evidence / Verification

Educational thresholds and domain rules should have provenance.

---

# 13.1 Planned `public.domain_references` (not deployed)

This is a future traceability design. Phase 25 records source-review decisions
in its internal audit register and preserves source metadata already present in
content; it does not require this table. No repository migration creates
`public.domain_references` or its dependent join tables, and the live project
does not contain them. Do not treat the DDL below or migration step 008 in the
recommended sequence as deployed schema.

```sql
create table public.domain_references (
  id uuid primary key default gen_random_uuid(),

  reference_type public.domain_reference_type not null,

  title text not null,
  source_url text,
  citation_text text,
  notes text,

  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),

  constraint domain_references_source_chk
    check (
      source_url is not null
      or citation_text is not null
      or reference_type = 'expert_review'
    )
);
```

These records support traceability.

They are not intended to reproduce copyrighted material.

---

# 14. Validation Configuration

---

# 14.1 `public.validation_configs`

```sql
create table public.validation_configs (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  validator_type public.validator_type not null,

  severity public.validation_severity not null default 'error',

  weight numeric(8,3) not null default 1,

  config jsonb not null default '{}'::jsonb,

  pass_message_en text,
  pass_message_sr text,

  fail_message_en text,
  fail_message_sr text,

  verification_status public.verification_status not null default 'unverified',

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint validation_configs_weight_chk
    check (weight >= 0),

  constraint validation_configs_json_object_chk
    check (jsonb_typeof(config) = 'object')
);
```

Index:

```sql
create index validation_configs_type_idx
  on public.validation_configs(validator_type);
```

---

# 14.2 `public.validation_reference_links`

```sql
create table public.validation_reference_links (
  validation_config_id uuid not null
    references public.validation_configs(id)
    on delete cascade,

  domain_reference_id uuid not null
    references public.domain_references(id)
    on delete cascade,

  primary key (validation_config_id, domain_reference_id)
);
```

---

# 14.3 `public.practice_step_validations`

```sql
create table public.practice_step_validations (
  step_id uuid not null
    references public.practice_steps(id)
    on delete cascade,

  validation_config_id uuid not null
    references public.validation_configs(id)
    on delete restrict,

  sort_order integer not null default 0,

  primary key (step_id, validation_config_id)
);
```

---

# 14.4 `public.practice_lesson_validations`

Final Design Check rules.

```sql
create table public.practice_lesson_validations (
  lesson_id uuid not null
    references public.practice_lessons(id)
    on delete cascade,

  validation_config_id uuid not null
    references public.validation_configs(id)
    on delete restrict,

  sort_order integer not null default 0,

  primary key (lesson_id, validation_config_id)
);
```

---

# 15. Asset Metadata

Supabase Storage stores bytes.

`public.assets` stores application metadata and authorization relationships.

---

# 15.1 `public.assets`

```sql
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

  constraint assets_bucket_path_key
    unique (bucket_id, object_path),

  constraint assets_owner_scope_chk
    check (
      (scope = 'user' and owner_user_id is not null)
      or
      (scope = 'platform')
    ),

  constraint assets_visibility_scope_chk
    check (
      scope = 'platform'
      or visibility = 'private'
    ),

  constraint assets_byte_size_chk
    check (byte_size is null or byte_size >= 0),

  constraint assets_sha256_chk
    check (
      sha256 is null
      or sha256 ~ '^[A-Fa-f0-9]{64}$'
    )
);
```

Notes:

- platform assets may optionally carry an owner/admin creator but ownership authorization is not based on `owner_user_id`;
- user assets are always private;
- `bucket_id` + `object_path` maps to Supabase Storage.

Indexes:

```sql
create index assets_owner_created_idx
  on public.assets(owner_user_id, created_at desc)
  where owner_user_id is not null;

create index assets_scope_visibility_status_idx
  on public.assets(scope, visibility, status);

create index assets_kind_status_idx
  on public.assets(kind, status);

create index assets_sha256_idx
  on public.assets(sha256)
  where sha256 is not null;
```

---

# 15.2 `public.model_assets`

One-to-one extension for 3D model metadata.

```sql
create table public.model_assets (
  asset_id uuid primary key
    references public.assets(id)
    on delete cascade,

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

  constraint model_assets_vertex_count_chk
    check (vertex_count is null or vertex_count >= 0),

  constraint model_assets_triangle_count_chk
    check (triangle_count is null or triangle_count >= 0),

  constraint model_assets_bbox_min_chk
    check (bbox_min is null or array_length(bbox_min, 1) = 3),

  constraint model_assets_bbox_max_chk
    check (bbox_max is null or array_length(bbox_max, 1) = 3),

  constraint model_assets_transform_object_chk
    check (
      original_to_canonical is null
      or jsonb_typeof(original_to_canonical) = 'object'
    ),

  constraint model_assets_metadata_object_chk
    check (jsonb_typeof(technical_metadata) = 'object')
);
```

Indexes:

```sql
create index model_assets_format_idx
  on public.model_assets(format);

create index model_assets_default_role_idx
  on public.model_assets(default_role);
```

---

# 15.3 `public.asset_licenses`

Required for externally sourced platform assets when applicable.

```sql
create table public.asset_licenses (
  asset_id uuid primary key
    references public.assets(id)
    on delete cascade,

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
```

Publication rule:

Externally sourced platform assets should not be published until licensing has been reviewed.

This can be enforced initially in Admin application validation and later by publication RPCs.

---

# 15.4 Add FK for Practice Hint Demo

After `assets` exists:

```sql
alter table public.practice_hints
add constraint practice_hints_demo_asset_fk
foreign key (demo_asset_id)
references public.assets(id)
on delete set null;
```

---

# 16. Tool Demonstrations

---

# 16.1 `public.tool_demos`

```sql
create table public.tool_demos (
  id uuid primary key default gen_random_uuid(),

  tool_id text not null
    references public.tool_definitions(id)
    on delete cascade,

  demo_kind public.demo_kind not null,

  asset_id uuid
    references public.assets(id)
    on delete set null,

  config jsonb not null default '{}'::jsonb,

  status public.content_status not null default 'draft',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tool_demos_config_object_chk
    check (jsonb_typeof(config) = 'object'),

  constraint tool_demos_asset_or_interactive_chk
    check (
      demo_kind = 'interactive_3d'
      or asset_id is not null
    )
);
```

Indexes:

```sql
create index tool_demos_tool_status_idx
  on public.tool_demos(tool_id, status);
```

---

# 17. Material Presets

Material presets may influence exercise-specific analysis thresholds.

They must not be treated as universal medical truth.

---

# 17.1 `public.material_presets`

```sql
create table public.material_presets (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  name_en text not null,
  name_sr text not null,

  description_en text,
  description_sr text,

  settings jsonb not null default '{}'::jsonb,

  verification_status public.verification_status not null default 'unverified',

  status public.content_status not null default 'draft',

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint material_presets_slug_chk
    check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),

  constraint material_presets_settings_object_chk
    check (jsonb_typeof(settings) = 'object')
);
```

---

# 17.2 `public.material_preset_references`

```sql
create table public.material_preset_references (
  material_preset_id uuid not null
    references public.material_presets(id)
    on delete cascade,

  domain_reference_id uuid not null
    references public.domain_references(id)
    on delete cascade,

  primary key (material_preset_id, domain_reference_id)
);
```

---

# 18. Free Lab Scenario Tables

---

# 18.1 `public.scenarios`

```sql
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),

  domain_id uuid not null
    references public.content_domains(id)
    on delete restrict,

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

  material_preset_id uuid
    references public.material_presets(id)
    on delete set null,

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

  constraint scenarios_slug_chk
    check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),

  constraint scenarios_patient_age_chk
    check (patient_age is null or patient_age between 0 and 120),

  constraint scenarios_metadata_object_chk
    check (jsonb_typeof(additional_metadata) = 'object'),

  constraint scenarios_published_at_chk
    check (
      status <> 'published'
      or published_at is not null
    )
);
```

`patient_code` must be fictional/anonymized for platform content.

Indexes:

```sql
create index scenarios_domain_difficulty_status_idx
  on public.scenarios(domain_id, difficulty, status);

create index scenarios_random_pool_idx
  on public.scenarios(domain_id, difficulty)
  where status = 'published'
    and random_eligible = true;
```

---

# 18.2 `public.scenario_assets`

```sql
create table public.scenario_assets (
  scenario_id uuid not null
    references public.scenarios(id)
    on delete cascade,

  asset_id uuid not null
    references public.assets(id)
    on delete restrict,

  object_role public.cad_object_role not null,

  sort_order integer not null default 0,
  required boolean not null default true,

  primary key (scenario_id, asset_id, object_role)
);
```

Indexes:

```sql
create index scenario_assets_asset_idx
  on public.scenario_assets(asset_id);

create index scenario_assets_scenario_order_idx
  on public.scenario_assets(scenario_id, sort_order);
```

---

# 18.3 `public.scenario_tools`

Optional scenario-level tool allowlist/override.

```sql
create table public.scenario_tools (
  scenario_id uuid not null
    references public.scenarios(id)
    on delete cascade,

  tool_id text not null
    references public.tool_definitions(id)
    on delete cascade,

  primary key (scenario_id, tool_id)
);
```

If no explicit rows exist, the application infers relevant tools from object roles and workflow.

---

# 18.4 `public.scenario_validations`

Free Lab scenarios may expose optional Design Check rules without turning the experience into Guided Practice.

```sql
create table public.scenario_validations (
  scenario_id uuid not null
    references public.scenarios(id)
    on delete cascade,

  validation_config_id uuid not null
    references public.validation_configs(id)
    on delete restrict,

  sort_order integer not null default 0,

  primary key (scenario_id, validation_config_id)
);
```

---

# 19. Lesson Assets / References

---

# 19.1 `public.practice_lesson_assets`

```sql
create table public.practice_lesson_assets (
  lesson_id uuid not null
    references public.practice_lessons(id)
    on delete cascade,

  asset_id uuid not null
    references public.assets(id)
    on delete restrict,

  object_role public.cad_object_role not null,

  is_reference boolean not null default false,

  sort_order integer not null default 0,

  primary key (lesson_id, asset_id, object_role)
);
```

Indexes:

```sql
create index practice_lesson_assets_asset_idx
  on public.practice_lesson_assets(asset_id);
```

The same mechanism supports:

- working models;
- antagonist;
- reference geometry.

---

# 19.2 `public.lesson_domain_references`

```sql
create table public.lesson_domain_references (
  lesson_id uuid not null
    references public.practice_lessons(id)
    on delete cascade,

  domain_reference_id uuid not null
    references public.domain_references(id)
    on delete cascade,

  primary key (lesson_id, domain_reference_id)
);
```

---

# 20. Tooth Library

The product requires an educational tooth library without proprietary commercial libraries.

---

# 20.1 `public.tooth_sets`

```sql
create table public.tooth_sets (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  name_en text not null,
  name_sr text not null,

  description_en text,
  description_sr text,

  status public.content_status not null default 'draft',

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tooth_sets_slug_chk
    check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')
);
```

---

# 20.2 `public.tooth_set_members`

```sql
create table public.tooth_set_members (
  tooth_set_id uuid not null
    references public.tooth_sets(id)
    on delete cascade,

  tooth_number smallint not null,

  asset_id uuid not null
    references public.assets(id)
    on delete restrict,

  primary key (tooth_set_id, tooth_number),

  constraint tooth_set_members_fdi_chk
    check (
      tooth_number between 11 and 18
      or tooth_number between 21 and 28
      or tooth_number between 31 and 38
      or tooth_number between 41 and 48
    )
);
```

Index:

```sql
create index tooth_set_members_asset_idx
  on public.tooth_set_members(asset_id);
```

---

# 21. User CAD Cases

---

# 21.1 `public.user_cases`

Represents one logical CAD project.

```sql
create table public.user_cases (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  source_type public.case_source_type not null,

  practice_lesson_id uuid
    references public.practice_lessons(id)
    on delete set null,

  scenario_id uuid
    references public.scenarios(id)
    on delete set null,

  domain_id uuid
    references public.content_domains(id)
    on delete set null,

  title text not null,

  status public.case_status not null default 'in_progress',

  source_snapshot jsonb not null default '{}'::jsonb,

  duplicated_from_case_id uuid
    references public.user_cases(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz,

  constraint user_cases_title_chk
    check (char_length(title) between 1 and 180),

  constraint user_cases_snapshot_object_chk
    check (jsonb_typeof(source_snapshot) = 'object'),

  constraint user_cases_source_shape_chk
    check (
      (
        source_type = 'practice'
        and practice_lesson_id is not null
      )
      or
      (
        source_type = 'scenario'
        and scenario_id is not null
      )
      or
      (
        source_type in ('import', 'blank')
        and practice_lesson_id is null
        and scenario_id is null
      )
    )
);
```

`source_snapshot` preserves the brief/lesson source context at case creation time so later admin edits do not silently alter an existing user's case.

Indexes:

```sql
create index user_cases_user_updated_idx
  on public.user_cases(user_id, updated_at desc);

create index user_cases_user_status_idx
  on public.user_cases(user_id, status);

create index user_cases_practice_lesson_idx
  on public.user_cases(practice_lesson_id)
  where practice_lesson_id is not null;

create index user_cases_scenario_idx
  on public.user_cases(scenario_id)
  where scenario_id is not null;
```

---

# 22. Stable Case Objects

---

# 22.1 `public.case_objects`

Represents logical objects inside a case.

Examples:

```text
Upper Jaw
Lower Jaw
Tooth 11
Crown 26
Denture Base
Reference
```

Schema:

```sql
create table public.case_objects (
  id uuid primary key default gen_random_uuid(),

  case_id uuid not null
    references public.user_cases(id)
    on delete cascade,

  role public.cad_object_role not null,

  name text not null,

  source_asset_id uuid
    references public.assets(id)
    on delete set null,

  created_at timestamptz not null default now(),
  retired_at timestamptz,

  constraint case_objects_name_chk
    check (char_length(name) between 1 and 160)
);
```

Indexes:

```sql
create index case_objects_case_idx
  on public.case_objects(case_id);

create index case_objects_case_role_idx
  on public.case_objects(case_id, role);
```

`retired_at` is used rather than deleting stable object identity if historical revisions still reference it.

---

# 23. Immutable Geometry Versions

---

# 23.1 `public.case_object_versions`

A new row is created only when the object's geometry changes.

Examples requiring new geometry version:

- sculpting;
- trim;
- fill hole;
- boolean;
- topology modification.

Transform-only changes do not require a new geometry version.

```sql
create table public.case_object_versions (
  id uuid primary key default gen_random_uuid(),

  case_object_id uuid not null
    references public.case_objects(id)
    on delete cascade,

  version_number integer not null,

  geometry_asset_id uuid not null
    references public.assets(id)
    on delete restrict,

  vertex_count bigint,
  triangle_count bigint,

  geometry_hash text,

  created_by uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  constraint case_object_versions_object_version_key
    unique (case_object_id, version_number),

  constraint case_object_versions_vertex_chk
    check (vertex_count is null or vertex_count >= 0),

  constraint case_object_versions_triangle_chk
    check (triangle_count is null or triangle_count >= 0),

  constraint case_object_versions_hash_chk
    check (
      geometry_hash is null
      or geometry_hash ~ '^[A-Fa-f0-9]{64}$'
    )
);
```

Indexes:

```sql
create index case_object_versions_object_created_idx
  on public.case_object_versions(case_object_id, created_at desc);

create index case_object_versions_asset_idx
  on public.case_object_versions(geometry_asset_id);
```

---

# 24. Cloud Save Revisions

---

# 24.1 `public.case_revisions`

A row represents one successful official cloud Save.

```sql
create table public.case_revisions (
  id uuid primary key default gen_random_uuid(),

  case_id uuid not null
    references public.user_cases(id)
    on delete cascade,

  revision_number integer not null,

  created_by uuid not null
    references auth.users(id)
    on delete cascade,

  source_revision_id uuid
    references public.case_revisions(id)
    on delete set null,

  workspace_state jsonb not null default '{}'::jsonb,

  change_summary text,

  created_at timestamptz not null default now(),

  constraint case_revisions_case_number_key
    unique (case_id, revision_number),

  constraint case_revisions_case_id_id_key
    unique (case_id, id),

  constraint case_revisions_number_chk
    check (revision_number > 0),

  constraint case_revisions_workspace_object_chk
    check (jsonb_typeof(workspace_state) = 'object')
);
```

`workspace_state` can contain small project-level state:

- workflow state;
- active analysis preferences;
- optional camera state;
- Practice runtime metadata required to resume.

Do not put geometry arrays here.

Indexes:

```sql
create index case_revisions_case_created_idx
  on public.case_revisions(case_id, created_at desc);

create index case_revisions_created_by_idx
  on public.case_revisions(created_by);
```

---

# 24.2 `public.case_revision_objects`

Snapshot of object state at a revision.

```sql
create table public.case_revision_objects (
  revision_id uuid not null
    references public.case_revisions(id)
    on delete cascade,

  case_object_id uuid not null
    references public.case_objects(id)
    on delete restrict,

  object_version_id uuid not null
    references public.case_object_versions(id)
    on delete restrict,

  position double precision[] not null default array[0.0, 0.0, 0.0],
  rotation_quaternion double precision[] not null default array[0.0, 0.0, 0.0, 1.0],
  scale double precision[] not null default array[1.0, 1.0, 1.0],

  visible boolean not null default true,

  object_state jsonb not null default '{}'::jsonb,

  primary key (revision_id, case_object_id),

  constraint case_revision_objects_position_chk
    check (array_length(position, 1) = 3),

  constraint case_revision_objects_rotation_chk
    check (array_length(rotation_quaternion, 1) = 4),

  constraint case_revision_objects_scale_chk
    check (
      array_length(scale, 1) = 3
      and scale[1] > 0
      and scale[2] > 0
      and scale[3] > 0
    ),

  constraint case_revision_objects_state_object_chk
    check (jsonb_typeof(object_state) = 'object')
);
```

Indexes:

```sql
create index case_revision_objects_object_idx
  on public.case_revision_objects(case_object_id);

create index case_revision_objects_version_idx
  on public.case_revision_objects(object_version_id);
```

Application/database save function must verify:

- `case_object.case_id = revision.case_id`;
- `case_object_version.case_object_id = case_object_id`.

These cross-table ownership checks should be enforced in the save transaction/RPC.

---

# 24.3 `public.case_heads`

Stores the current official revision of each case.

```sql
create table public.case_heads (
  case_id uuid primary key
    references public.user_cases(id)
    on delete cascade,

  revision_id uuid not null,

  updated_at timestamptz not null default now(),

  constraint case_heads_revision_fk
    foreign key (case_id, revision_id)
    references public.case_revisions(case_id, id)
    on delete cascade
);
```

This avoids a loose `current_revision_id` on `user_cases`.

---

# 24.4 `public.case_checkpoints`

```sql
create table public.case_checkpoints (
  id uuid primary key default gen_random_uuid(),

  case_id uuid not null
    references public.user_cases(id)
    on delete cascade,

  revision_id uuid not null,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,

  created_at timestamptz not null default now(),

  constraint case_checkpoints_revision_fk
    foreign key (case_id, revision_id)
    references public.case_revisions(case_id, id)
    on delete cascade,

  constraint case_checkpoints_case_name_key
    unique (case_id, name),

  constraint case_checkpoints_name_chk
    check (char_length(name) between 1 and 120)
);
```

Indexes:

```sql
create index case_checkpoints_case_created_idx
  on public.case_checkpoints(case_id, created_at desc);

create index case_checkpoints_user_idx
  on public.case_checkpoints(user_id);
```

---

# 25. Practice Attempts

---

# 25.1 `public.practice_attempts`

```sql
create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  lesson_id uuid not null
    references public.practice_lessons(id)
    on delete restrict,

  case_id uuid
    references public.user_cases(id)
    on delete set null,

  status public.attempt_status not null default 'in_progress',

  score numeric(5,2),

  reference_used boolean not null default false,

  final_validation_summary jsonb not null default '{}'::jsonb,

  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,

  constraint practice_attempts_score_chk
    check (score is null or score between 0 and 100),

  constraint practice_attempts_summary_object_chk
    check (jsonb_typeof(final_validation_summary) = 'object'),

  constraint practice_attempts_completed_dates_chk
    check (
      status <> 'completed'
      or completed_at is not null
    )
);
```

Indexes:

```sql
create index practice_attempts_user_started_idx
  on public.practice_attempts(user_id, started_at desc);

create index practice_attempts_user_lesson_idx
  on public.practice_attempts(user_id, lesson_id, started_at desc);

create index practice_attempts_lesson_completed_idx
  on public.practice_attempts(lesson_id, completed_at desc)
  where status = 'completed';

create index practice_attempts_in_progress_idx
  on public.practice_attempts(user_id, started_at desc)
  where status = 'in_progress';
```

---

# 25.2 `public.attempt_step_results`

```sql
create table public.attempt_step_results (
  attempt_id uuid not null
    references public.practice_attempts(id)
    on delete cascade,

  step_id uuid not null
    references public.practice_steps(id)
    on delete restrict,

  status public.step_result_status not null default 'not_started',

  score numeric(5,2),

  started_at timestamptz,
  completed_at timestamptz,

  validation_summary jsonb not null default '{}'::jsonb,

  primary key (attempt_id, step_id),

  constraint attempt_step_results_score_chk
    check (score is null or score between 0 and 100),

  constraint attempt_step_results_summary_chk
    check (jsonb_typeof(validation_summary) = 'object')
);
```

Index:

```sql
create index attempt_step_results_step_idx
  on public.attempt_step_results(step_id);
```

---

# 25.3 `public.attempt_validation_results`

Preserves actual Design Check output from an attempt.

```sql
create table public.attempt_validation_results (
  id uuid primary key default gen_random_uuid(),

  attempt_id uuid not null
    references public.practice_attempts(id)
    on delete cascade,

  step_id uuid
    references public.practice_steps(id)
    on delete set null,

  validation_config_id uuid
    references public.validation_configs(id)
    on delete set null,

  outcome public.validation_outcome not null,

  severity public.validation_severity not null,

  measured_value jsonb,

  message_en text,
  message_sr text,

  details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint attempt_validation_results_value_chk
    check (
      measured_value is null
      or jsonb_typeof(measured_value) in ('object', 'array', 'number', 'string', 'boolean')
    ),

  constraint attempt_validation_results_details_chk
    check (jsonb_typeof(details) = 'object')
);
```

Indexes:

```sql
create index attempt_validation_results_attempt_idx
  on public.attempt_validation_results(attempt_id);

create index attempt_validation_results_config_idx
  on public.attempt_validation_results(validation_config_id)
  where validation_config_id is not null;

create index attempt_validation_results_failures_idx
  on public.attempt_validation_results(attempt_id, severity)
  where outcome in ('warning', 'fail');
```

Messages are snapshotted so later edits to validation copy do not rewrite historical results.

---

# 26. User Lesson Progress

---

# 26.1 `public.user_lesson_progress`

One aggregate row per user/lesson.

```sql
create table public.user_lesson_progress (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  lesson_id uuid not null
    references public.practice_lessons(id)
    on delete cascade,

  attempts_count integer not null default 0,

  completed boolean not null default false,

  best_score numeric(5,2),

  best_attempt_id uuid
    references public.practice_attempts(id)
    on delete set null,

  first_completed_at timestamptz,
  last_completed_at timestamptz,
  last_attempt_at timestamptz,

  updated_at timestamptz not null default now(),

  primary key (user_id, lesson_id),

  constraint user_lesson_progress_attempts_chk
    check (attempts_count >= 0),

  constraint user_lesson_progress_score_chk
    check (best_score is null or best_score between 0 and 100)
);
```

Indexes:

```sql
create index user_lesson_progress_user_completed_idx
  on public.user_lesson_progress(user_id, completed, updated_at desc);

create index user_lesson_progress_lesson_idx
  on public.user_lesson_progress(lesson_id);
```

This table should be updated transactionally when an attempt is finalized.

Client users should not directly set arbitrary `best_score`.

---

# 27. User Skill Progress

---

# 27.1 `public.user_skill_progress`

Cached aggregate for Dashboard/Progress UI.

```sql
create table public.user_skill_progress (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  skill_id uuid not null
    references public.skills(id)
    on delete cascade,

  attempted_lessons integer not null default 0,
  completed_lessons integer not null default 0,

  progress_percent numeric(5,2) not null default 0,
  proficiency_score numeric(5,2),

  last_activity_at timestamptz,

  updated_at timestamptz not null default now(),

  primary key (user_id, skill_id),

  constraint user_skill_progress_counts_chk
    check (
      attempted_lessons >= 0
      and completed_lessons >= 0
      and completed_lessons <= attempted_lessons
    ),

  constraint user_skill_progress_percent_chk
    check (progress_percent between 0 and 100),

  constraint user_skill_progress_score_chk
    check (
      proficiency_score is null
      or proficiency_score between 0 and 100
    )
);
```

Index:

```sql
create index user_skill_progress_user_activity_idx
  on public.user_skill_progress(user_id, last_activity_at desc);
```

This is derived/cache data.

It must be updated by trusted database/application logic, not arbitrary client updates.

---

# 28. Screenshots and Annotations

---

# 28.1 `public.case_screenshots`

```sql
create table public.case_screenshots (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  case_id uuid not null
    references public.user_cases(id)
    on delete cascade,

  revision_id uuid
    references public.case_revisions(id)
    on delete set null,

  asset_id uuid not null
    references public.assets(id)
    on delete restrict,

  camera_state jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint case_screenshots_camera_chk
    check (jsonb_typeof(camera_state) = 'object')
);
```

Indexes:

```sql
create index case_screenshots_case_created_idx
  on public.case_screenshots(case_id, created_at desc);

create index case_screenshots_user_idx
  on public.case_screenshots(user_id);
```

---

# 28.2 `public.screenshot_annotations`

```sql
create table public.screenshot_annotations (
  id uuid primary key default gen_random_uuid(),

  screenshot_id uuid not null
    references public.case_screenshots(id)
    on delete cascade,

  annotation_type public.annotation_type not null,

  payload jsonb not null,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint screenshot_annotations_payload_chk
    check (jsonb_typeof(payload) = 'object')
);
```

Index:

```sql
create index screenshot_annotations_screenshot_order_idx
  on public.screenshot_annotations(screenshot_id, sort_order);
```

Example payload:

```json
{
  "x": 0.44,
  "y": 0.31,
  "text": "Check contact"
}
```

Coordinates should be normalized to screenshot dimensions.

---

# 29. Admin Audit

---

# 29.1 `app_private.admin_audit_log`

```sql
create table app_private.admin_audit_log (
  id uuid primary key default gen_random_uuid(),

  admin_user_id uuid
    references auth.users(id)
    on delete set null,

  action app_private.admin_audit_action not null,

  entity_type text not null,
  entity_id uuid,

  before_data jsonb,
  after_data jsonb,

  created_at timestamptz not null default now()
);
```

Indexes:

```sql
create index admin_audit_log_admin_created_idx
  on app_private.admin_audit_log(admin_user_id, created_at desc);

create index admin_audit_log_entity_idx
  on app_private.admin_audit_log(entity_type, entity_id, created_at desc);
```

Direct authenticated access is not required.

---

# 30. Entity Relationship Summary

```text
auth.users
  ├── 1:1 profiles
  ├── 1:1 app_private.user_roles
  ├── 1:N user_cases
  ├── 1:N practice_attempts
  ├── 1:N assets (user scope)
  ├── 1:N case_screenshots
  └── 1:N user_lesson_progress / user_skill_progress

content_domains
  ├── 1:N practice_modules
  └── 1:N scenarios

practice_modules
  └── 1:N practice_lessons

practice_lessons
  ├── 1:N practice_steps
  ├── N:M prerequisites
  ├── N:M skills
  ├── N:M assets
  ├── N:M validation_configs
  ├── N:M domain_references
  ├── 1:N practice_attempts
  └── 1:N user_lesson_progress

practice_steps
  ├── N:M tool_definitions
  ├── 1:N practice_hints
  ├── N:M validation_configs
  └── 1:N attempt_step_results

scenarios
  ├── N:M assets
  ├── N:M tool_definitions
  ├── N:M validation_configs
  └── 1:N user_cases

assets
  ├── 0:1 model_assets
  ├── 0:1 asset_licenses
  ├── N:M lessons
  ├── N:M scenarios
  ├── 1:N case_object_versions
  └── 1:N screenshots

user_cases
  ├── 1:N case_objects
  ├── 1:N case_revisions
  ├── 1:1 case_heads
  ├── 1:N case_checkpoints
  ├── 1:N case_screenshots
  └── 0:N practice_attempts

case_objects
  └── 1:N case_object_versions

case_revisions
  └── N:M case_objects through case_revision_objects
```

---

# 31. Why CAD Revisions Are Normalized This Way

A naive design could store:

```text
case_revision
└── one giant scene.glb
```

for every Save.

That is simple but wasteful.

Example:

- 80 MB scene;
- user moves one tooth;
- presses Save;
- another 80 MB file is created.

The proposed design separates:

```text
Stable logical object
    ↓
Immutable geometry version
    ↓
Revision object state
```

Therefore:

### Move / rotate / scale

No new geometry file.

Only:

```text
case_revision_objects.position
case_revision_objects.rotation_quaternion
case_revision_objects.scale
```

change.

### Sculpt tooth

Create one new geometry asset/version only for that tooth.

Other meshes are reused.

### Trim scan

Create one new geometry version for the scan.

This design better matches a CAD application's behavior.

---

# 32. Save Transaction

A successful Save should conceptually be atomic at the database metadata layer.

Recommended server/RPC flow:

1. authenticate user;
2. lock/check target case;
3. verify case ownership;
4. determine next `revision_number`;
5. verify uploaded new geometry assets belong to user;
6. create any required `case_object_versions`;
7. insert `case_revisions`;
8. insert all `case_revision_objects`;
9. update `case_heads`;
10. commit transaction.

If metadata commit fails:

- uploaded unreferenced Storage objects may remain orphaned temporarily;
- a cleanup process can later remove stale assets with no references.

---

# 33. Recommended Save RPC

Implement a database function or server transaction such as:

```text
commit_case_revision(...)
```

Do not let the browser independently perform fifteen writes and hope they all succeed.

The function must verify:

```text
auth.uid() = user_cases.user_id
```

and all object/version relationships.

The exact function signature should be implemented after TypeScript save payloads are finalized.

---

# 34. Practice Attempt Finalization

Likewise, completing Practice should use one transactional operation.

Conceptual:

```text
finalize_practice_attempt(...)
```

Responsibilities:

1. verify attempt belongs to current user;
2. store final score/status;
3. store/confirm validation results;
4. update `user_lesson_progress`;
5. recompute affected `user_skill_progress`;
6. commit.

This prevents partial state such as:

```text
attempt completed
but progress not updated
```

---

# 35. Best Result Logic

`user_lesson_progress.best_score` is:

```text
max(completed attempt score)
```

when scores exist.

If scores are disabled for a lesson:

- completion remains valid;
- `best_score` may remain null.

Best result is secondary UI.

---

# 36. Skill Progress Logic

Recommended initial definition:

```text
progress_percent =
completed published lessons contributing to skill
/
total published lessons contributing to skill
* 100
```

`proficiency_score` may be a weighted average of best lesson scores:

```text
SUM(best_score * lesson_skill_weight)
/
SUM(lesson_skill_weight)
```

Only completed scored lessons participate.

This formula is educational/product progress, not a clinical competence certification.

---

# 37. Random Scenario Query

Example:

```sql
select *
from public.scenarios
where status = 'published'
  and random_eligible = true
  and domain_id = :domain_id
  and difficulty = :difficulty
order by random()
limit 1;
```

For a small scenario library this is sufficient.

If the library becomes very large, replace `order by random()` with a more scalable random-selection strategy.

---

# 38. Content Publication Rules

Before publishing a Practice lesson:

- module must be published or publishable;
- lesson must have at least one step;
- required assets must be ready;
- referenced tools must be published/available;
- validators must exist;
- localized English and Serbian required content must exist;
- external asset licensing must be approved;
- domain-sensitive values should have appropriate verification metadata.

Before publishing a scenario:

- required assets ready;
- title/brief localized;
- fictional/anonymized patient metadata only;
- no invalid asset references.

These checks should live in a trusted publish RPC/server operation rather than only UI validation.

---

# 39. Content Deletion Strategy

For educational/admin content, prefer:

```text
draft → published → archived
```

over physical deletion.

Reasons:

- old user attempts may reference content;
- existing cases may reference scenarios;
- audit/history must remain understandable.

Hard delete is appropriate mainly for never-published unused drafts when no FK references exist.

---

# 40. User Case Deletion Strategy

A user may delete a case.

Database:

```text
user_cases delete
→ cascade case_objects
→ cascade revisions
→ cascade checkpoints
→ cascade screenshots metadata
```

Storage bytes are **not automatically deleted by PostgreSQL FK cascades**.

Application/server cleanup must call Supabase Storage API for referenced user assets that are no longer used.

Never delete directly from `storage.objects` SQL.

---

# 41. Asset Reference Cleanup

An asset should not be physically removed if referenced by:

- scenario;
- Practice lesson;
- tool demo;
- case object;
- case object version;
- screenshot;
- tooth set.

Create an internal cleanup query/job to identify assets with no application references.

Only then call Storage API delete.

---

# 42. Row Level Security Strategy

RLS must be enabled on **every table in `public`**.

General categories:

## Public marketing content

Not stored in these core app tables or separately handled.

## Authenticated published content

Authenticated users:

```text
SELECT published
```

Admins:

```text
full CRUD
```

## User-owned data

Owner:

```text
SELECT / INSERT / UPDATE / DELETE
```

as appropriate.

Admin access:

Allowed only where product/support requirements require it.

## Derived progress tables

Owner:

```text
SELECT
```

Writes primarily via trusted functions.

---

# 43. Grants Strategy

For application tables:

```text
anon
→ revoke unless explicitly needed

authenticated
→ grant only required SQL operations

service_role
→ server-only
```

RLS and SQL grants both matter.

Do not assume RLS replaces privilege grants.

---

# 44. RLS Policy Style

Use separate policies for:

- SELECT;
- INSERT;
- UPDATE;
- DELETE.

Prefer:

```sql
(select auth.uid())
```

inside policies.

Example:

```sql
using ((select auth.uid()) = user_id)
```

Index every frequently filtered policy ownership column.

---

# 45. Profile RLS

```sql
alter table public.profiles enable row level security;
```

SELECT own:

```sql
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select public.is_admin())
);
```

UPDATE own:

```sql
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) = id
)
with check (
  (select auth.uid()) = id
);
```

No user-controlled role exists in this table.

---

# 46. Published Content RLS Pattern

Example for lessons:

```sql
alter table public.practice_lessons enable row level security;
```

Authenticated SELECT:

```sql
create policy "practice_lessons_select"
on public.practice_lessons
for select
to authenticated
using (
  status = 'published'
  or (select public.is_admin())
);
```

Admin INSERT:

```sql
create policy "practice_lessons_insert_admin"
on public.practice_lessons
for insert
to authenticated
with check (
  (select public.is_admin())
);
```

Admin UPDATE:

```sql
create policy "practice_lessons_update_admin"
on public.practice_lessons
for update
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
);
```

Admin DELETE:

```sql
create policy "practice_lessons_delete_admin"
on public.practice_lessons
for delete
to authenticated
using (
  (select public.is_admin())
);
```

Apply equivalent policy shape to:

- content_domains;
- skills;
- practice_modules;
- practice_steps;
- lesson prerequisites;
- tool definitions;
- tool demos;
- scenarios;
- tooth sets;
- material presets;
- validation configuration;
- relevant join tables.

Join table SELECT policies must ensure referenced parent content is published or user is admin.

---

# 47. Asset RLS

`assets` is mixed platform/user data.

SELECT:

```text
allow if:
- user owns user-scope asset;
OR
- platform asset is ready + visibility=authenticated;
OR
- current user is admin
```

Conceptual:

```sql
using (
  (
    scope = 'user'
    and owner_user_id = (select auth.uid())
  )
  or
  (
    scope = 'platform'
    and visibility = 'authenticated'
    and status = 'ready'
  )
  or
  (select public.is_admin())
)
```

INSERT:

Regular user can create only:

```text
scope=user
owner_user_id=auth.uid()
visibility=private
```

Admin can create platform assets.

UPDATE/DELETE:

- owner can manage own user asset if allowed by application lifecycle;
- admin can manage platform assets.

Referenced-asset deletion should go through server/application checks rather than raw client delete.

---

# 48. Model Asset RLS

`model_assets` access depends on the parent asset.

SELECT conceptual rule:

```sql
exists (
  select 1
  from public.assets a
  where a.id = model_assets.asset_id
    and user_can_read_asset(a)
)
```

Avoid exposing model metadata if the underlying asset is not accessible.

Admin writes.

For user imports, insert/update can be allowed only when parent asset belongs to current user.

---

# 49. User Case RLS

```sql
alter table public.user_cases enable row level security;
```

SELECT:

```sql
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
)
```

INSERT:

```sql
with check (
  user_id = (select auth.uid())
)
```

UPDATE:

```sql
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
)
```

DELETE:

```sql
using (
  user_id = (select auth.uid())
)
```

Admin support deletion should normally be performed through a trusted server path, not generic browser CRUD.

---

# 50. Case Child Table RLS

For:

- case_objects;
- case_object_versions;
- case_revisions;
- case_revision_objects;
- case_heads;
- case_checkpoints;

policy should derive ownership through `user_cases`.

Example:

```sql
exists (
  select 1
  from public.user_cases c
  where c.id = case_objects.case_id
    and c.user_id = (select auth.uid())
)
```

Create supporting indexes on all `case_id` columns.

For `case_object_versions`, ownership path:

```text
case_object_versions
→ case_objects
→ user_cases
```

Security-definer helper functions may be introduced if policy joins become a measurable performance problem.

---

# 51. Practice Attempt RLS

Owner SELECT:

```text
practice_attempts.user_id = auth.uid()
```

Owner INSERT:

```text
user_id = auth.uid()
```

Updates while in progress may be allowed for owner.

Final submission/progress update should prefer trusted RPC.

Admin may SELECT for support/content evaluation if required.

---

# 52. Progress RLS

`user_lesson_progress`:

- owner SELECT;
- no arbitrary client INSERT/UPDATE/DELETE;
- trusted functions/service perform writes.

`user_skill_progress`:

- owner SELECT;
- trusted functions perform writes.

This prevents users from simply setting:

```text
progress_percent = 100
```

through the API.

Even though the system is educational rather than certification, derived data should remain internally consistent.

---

# 53. Screenshot RLS

Screenshot owner:

```text
user_id = auth.uid()
```

Annotations derive ownership through screenshot.

Admin access only if support requirements justify it.

---

# 54. Admin Audit Access

`app_private.admin_audit_log`:

```text
anon          → none
authenticated → none
```

A trusted server/admin interface may expose selected audit data later.

---

# 55. RLS Policy Testing

Every RLS-protected area must have tests covering at least:

```text
anon denied
owner allowed
other authenticated user denied
admin allowed where intended
```

Specific cases:

- user A cannot read user B case;
- user A cannot read user B asset metadata;
- user A cannot read user B screenshot;
- user cannot publish lesson;
- user cannot create platform asset;
- admin can publish scenario;
- user can read published lesson;
- user cannot read draft lesson;
- user can read published platform model;
- user cannot modify `user_skill_progress`.

---

# 56. Storage Buckets

Recommended Supabase Storage buckets:

```text
practice-assets
user-imports
case-geometry
screenshots
marketing-assets
```

---

# 56.1 `practice-assets`

Private bucket.

Contains:

- lesson models;
- scenario models;
- reference geometry;
- tool demos;
- tooth-library assets;
- thumbnails.

Read:

- authenticated user when platform asset is available;
- admin.

Write:

- admin only.

---

# 56.2 `user-imports`

Private bucket.

Path:

```text
{user_id}/{asset_id}/{original_filename}
```

Read/write/delete:

- owner;
- trusted admin/server where required.

---

# 56.3 `case-geometry`

Private bucket.

Path:

```text
{user_id}/{case_id}/{case_object_id}/{object_version_id}.glb
```

Read/write:

- case owner;
- trusted server/admin where required.

Immutable geometry versions should not be overwritten.

---

# 56.4 `screenshots`

Private bucket.

Path:

```text
{user_id}/{case_id}/{screenshot_id}.webp
```

Owner only.

---

# 56.5 `marketing-assets`

Can be public if content is intentionally public.

Write:

- admin only.

This bucket is outside sensitive CAD data.

---

# 57. Storage RLS Principles

Supabase Storage policies are defined on:

```text
storage.objects
```

Do not manually manipulate Storage metadata rows.

Use Storage APIs for:

- upload;
- copy;
- move;
- delete.

Storage metadata is not the actual file object.

---

# 58. User Storage Policy Pattern

For user-generated buckets, prefer checking both:

- bucket;
- `owner_id`.

Example conceptual policy:

```sql
bucket_id = 'user-imports'
and owner_id = (select auth.uid()::text)
```

Path convention still contains the user ID for organization and defense in depth.

---

# 59. Platform Asset Storage Policy

For `practice-assets`, authenticated download can be allowed where the corresponding `public.assets` row is:

```text
scope = platform
visibility = authenticated
status = ready
```

Admin writes.

If policy joins on `assets`, ensure:

```text
assets(bucket_id, object_path)
```

is indexed/unique, which this design already requires.

---

# 60. Private Downloads

User/private CAD files should be retrieved using:

- authenticated Storage downloads; or
- short-lived signed URLs.

Do not expose permanent public URLs for:

- user imports;
- user saved geometry;
- screenshots.

---

# 61. Storage Ownership Note

Storage `owner_id` is useful for user-uploaded objects.

However ownership by itself is not access control.

RLS policies must enforce it.

Platform assets uploaded with elevated service credentials may not have a normal user owner, so application authorization should use `public.assets` metadata and admin rules for those files.

---

# 62. Index Strategy

Indexes are required for:

- primary/unique keys;
- foreign-key access paths;
- RLS ownership filters;
- common content filtering;
- recent-case ordering;
- progress aggregation.

---

# 63. Foreign Key Index Rule

PostgreSQL does not automatically index every foreign key.

Create explicit indexes for frequently traversed foreign keys.

Particularly:

```text
user_id
case_id
lesson_id
scenario_id
asset_id
skill_id
```

---

# 64. RLS Index Rule

Any high-volume column used in RLS filtering must be indexed.

Examples:

```sql
create index user_cases_user_id_idx
  on public.user_cases(user_id);

create index practice_attempts_user_id_idx
  on public.practice_attempts(user_id);

create index assets_owner_user_id_idx
  on public.assets(owner_user_id)
  where owner_user_id is not null;
```

Some composite indexes already cover these leading columns.

Avoid redundant duplicates when a composite index already begins with the same field.

---

# 65. Data Integrity Constraints

Important invariants:

## User assets

```text
scope=user → owner_user_id required
scope=user → visibility=private
```

## Practice source case

```text
source_type=practice → practice_lesson_id required
```

## Scenario source case

```text
source_type=scenario → scenario_id required
```

## Import / blank

No lesson/scenario foreign key.

## Scores

```text
0 <= score <= 100
```

## FDI tooth number

Adult teeth:

```text
11–18
21–28
31–38
41–48
```

## Project scale

All three scale components > 0.

## Localized published content

Required localized fields must be populated before publish.

The latter is best checked by publish function.

---

# 66. Cross-Table Integrity That Requires Functions

Some rules cannot be safely represented by simple FK/check constraints.

Examples:

- revision object belongs to same case as revision;
- object version belongs to the selected case object;
- checkpoint user owns case;
- best attempt belongs to same user/lesson progress row;
- published lesson assets are ready;
- published asset license is acceptable;
- scenario assets are platform content;
- final attempt belongs to the Practice case user.

Implement these in:

- transactional RPCs;
- trusted server actions;
- narrowly scoped triggers only where appropriate.

Do not add complex triggers for every workflow if a single explicit transaction function is clearer.

---

# 67. Recommended Database RPCs

---

## 67.1 `commit_case_revision`

Purpose:

Atomic CAD Save.

Must:

- authorize case;
- validate assets;
- allocate next revision number;
- create object versions;
- create revision;
- create revision-object states;
- move case head.

---

## 67.2 `finalize_practice_attempt`

Purpose:

Atomic Practice result submission.

Must:

- validate ownership;
- finalize attempt;
- update best lesson progress;
- update skill aggregates.

---

## 67.3 `publish_lesson`

Purpose:

Validate and publish lesson content.

Checks:

- module;
- steps;
- translations;
- assets;
- tool references;
- validators;
- license state.

---

## 67.4 `publish_scenario`

Equivalent publication checks for scenario.

---

## 67.5 `duplicate_case`

Purpose:

Safely create a new logical case while reusing immutable geometry assets where allowed.

---

# 68. Views

Views are optional and should be added only when they simplify application queries.

Potential views:

```text
published_practice_catalog
published_scenario_catalog
user_recent_cases
user_practice_summary
```

Any view reachable from client roles must be created with security behavior that preserves underlying RLS.

Prefer `security_invoker` on supported PostgreSQL versions.

Do not create owner-bypass views accidentally.

---

# 69. Example `published_practice_catalog` View

Conceptual:

```sql
create view public.published_practice_catalog
with (security_invoker = true)
as
select
  l.id,
  l.slug,
  l.difficulty,
  l.title_en,
  l.title_sr,
  l.estimated_minutes,
  m.id as module_id,
  m.slug as module_slug,
  m.sort_order as module_sort,
  l.sort_order as lesson_sort
from public.practice_lessons l
join public.practice_modules m
  on m.id = l.module_id
where l.status = 'published'
  and m.status = 'published';
```

This is optional.

The application can query base tables directly.

---

# 70. Updated-At Triggers

Attach `set_updated_at()` to mutable tables including:

```text
profiles
user_roles
content_domains
skills
practice_modules
practice_lessons
practice_steps
tool_definitions
tool_demos
validation_configs
assets
material_presets
scenarios
tooth_sets
user_cases
screenshot_annotations
```

Do not add it to immutable/historical tables such as:

```text
case_revisions
attempt_validation_results
admin_audit_log
```

---

# 71. Seed Data

Seed migrations should create:

- content domain rows;
- initial skills;
- CAD tool definitions;
- tool/object applicability;
- optionally basic validation configuration templates.

Do not seed licensed production dental models into migrations.

Binary content belongs in Storage/content setup.

---

# 72. Suggested Domain Seed

```text
cad_foundations
scan_model
sculpting
crown
bridge
inlay_onlay
veneer
complete_denture
partial_denture
bite_splint
digital_model
implant
```

---

# 73. Suggested Skills Seed

```text
cad_navigation
object_manipulation
scan_preparation
sculpting
margin_design
insertion_path
contact_analysis
occlusion
crown_design
bridge_design
complete_denture
partial_denture
surveying
splints
digital_models
implant_design
```

---

# 74. Suggested Tool Seed

At minimum:

```text
select
orbit
pan
zoom
move
rotate
scale
measure_distance
section
trim
delete_region
fill_hole
smooth
sculpt_add
sculpt_remove
sculpt_smooth
sculpt_flatten
sculpt_morph
margin
insertion_path
contacts
intersections
thickness
undercut
occlusion
```

Tool seed IDs are treated as code contracts.

Do not rename them casually once content references them.

---

# 75. Migration Order

Recommended migration sequence:

```text
001_extensions_and_schemas.sql
002_enums.sql
003_security_helpers.sql
004_profiles_and_roles.sql
005_content_domains_and_skills.sql
006_practice_curriculum.sql
007_tools.sql
008_domain_references_and_validation.sql
009_assets_and_models.sql
010_material_presets.sql
011_scenarios.sql
012_lesson_assets_and_tooth_library.sql
013_user_cases.sql
014_case_revision_system.sql
015_practice_attempts_and_progress.sql
016_screenshots.sql
017_admin_audit.sql
018_rls_grants_and_policies.sql
019_storage_buckets_and_policies.sql
020_rpc_functions.sql
021_views.sql
022_seed_registry_data.sql
```

Migration numbering can change, but dependencies should remain clear.

---

# 76. Migration Discipline

Rules:

- never edit a migration already applied to shared environments;
- create a new migration;
- migrations must contain schema + RLS changes together where practical;
- every new exposed table must enable RLS in the same migration;
- review grants explicitly;
- update generated TypeScript DB types after migrations.

---

# 77. Type Generation

After schema changes:

Generate Supabase TypeScript types and use them in the Next.js application.

Do not manually maintain duplicate table interfaces indefinitely.

Application domain types can wrap/generated DB types where useful.

---

# 78. Database Tests

Use Supabase/Postgres tests for:

- RLS;
- constraints;
- RPC behavior;
- progress aggregation;
- revision consistency;
- publication rules.

---

# 79. Critical RLS Tests

Must prove:

```text
anon cannot read app tables
user A cannot read user B case
user A cannot read user B revision
user A cannot read user B private asset metadata
user A cannot mutate admin content
user cannot modify own role
user cannot directly forge skill progress
admin can edit draft content
authenticated user can read published Practice content
authenticated user cannot read draft Practice content
```

---

# 80. Critical Revision Tests

Test:

1. create case;
2. save revision 1;
3. add object version;
4. save revision 2;
5. transform-only revision reuses geometry version;
6. sculpt revision references new object version;
7. checkpoint points to correct revision;
8. user cannot attach another user's asset;
9. user cannot update another user's case head.

---

# 81. Critical Progress Tests

Test:

- first completed attempt creates progress;
- second lower score increments attempts but keeps best score;
- higher score replaces best attempt;
- unscored lesson completes with null best score;
- skill progress recalculates;
- archived lesson handling follows chosen product rule.

---

# 82. Archived Lesson Progress Rule

Recommended:

Historical completion remains visible.

Progress denominator should use currently published lessons.

Therefore:

- archived lesson result is retained in history;
- it does not necessarily count toward current module completion denominator.

If this causes confusing percentage changes after content updates, show absolute completion counts alongside percentages.

---

# 83. Practice Content Versioning

The initial database does not need a full Git-like lesson revision system.

Existing user cases preserve:

```text
source_snapshot
```

Attempts reference the lesson ID.

If educational content later requires strict audit/version reproducibility, add:

```text
practice_lesson_versions
```

Do not build this complexity before required.

---

# 84. Soft Delete vs Hard Delete

Use status/archival for:

- modules;
- lessons;
- scenarios;
- tools;
- material presets;
- tooth sets.

Use physical delete for:

- user-owned temporary data;
- unused drafts;
- annotations;
- user cases upon explicit user delete.

Historical attempts should normally remain until account/data deletion.

---

# 85. Account Deletion

Because user-owned tables reference:

```text
auth.users(id) on delete cascade
```

account deletion should remove application-owned user data.

Storage bytes still require Storage API cleanup.

Implement account-deletion workflow:

1. enumerate user's owned Storage assets;
2. delete Storage objects through API;
3. delete Auth user;
4. FK cascades remove database rows.

Confirm behavior in a staging environment.

---

# 86. Privacy Minimization

Do not create columns for:

- real patient name;
- patient email;
- patient phone;
- patient address;
- health record number.

Platform scenarios need only fictional:

- Patient ID;
- age if educationally relevant;
- technical case metadata.

User uploads are treated as private practice files.

---

# 87. Data Retention

Initial recommendation:

- saved cases retained until user deletes them;
- Practice attempts retained while account exists;
- archived educational content retained;
- local recovery is browser-side and expires separately;
- unreferenced failed uploads can be periodically cleaned up.

A formal legal retention policy can be added if Prostheia becomes a production business.

---

# 88. Failed Upload Cleanup

`assets.status = 'uploading'` or `'failed'` can become stale.

Cleanup strategy:

- identify rows older than a threshold;
- verify no content/case references;
- delete Storage object if present;
- remove metadata.

Do not automatically delete a currently active resumable upload.

---

# 89. Asset Deduplication

`sha256` permits optional deduplication.

Do not globally deduplicate private user assets across different users in a way that leaks file existence.

Safe uses:

- detect duplicate platform assets;
- reuse within the same user's case;
- verify upload integrity.

---

# 90. Search

Initial content search can use PostgreSQL `ILIKE` or simple filtering.

No dedicated search engine is required.

Potential searchable entities:

- lessons;
- scenarios;
- tooth sets.

If full-text search is later needed:

- add generated `tsvector` columns/indexes;
- support English/Serbian carefully.

Do not introduce Elasticsearch/Algolia before necessary.

---

# 91. Pagination

Admin/content lists and My Cases should use cursor or indexed pagination.

Recommended My Cases ordering:

```text
updated_at DESC, id DESC
```

Index:

```sql
(user_id, updated_at desc, id desc)
```

If cursor pagination is implemented, include stable tie-breaker ID.

---

# 92. Recommended Additional Index for My Cases

```sql
create index user_cases_user_updated_id_idx
on public.user_cases(user_id, updated_at desc, id desc);
```

This can replace a simpler overlapping `(user_id, updated_at desc)` index.

Avoid duplicate indexes in final migrations.

---

# 93. Random Scenario Scale Note

`ORDER BY random()` is acceptable while scenario count is small.

If scenarios reach very large scale, add:

```text
random_key
```

or a sampled selection mechanism.

Do not prematurely optimize.

---

# 94. Content Relationship Integrity

A published lesson/scenario should only reference:

- ready assets;
- published/usable tool definitions;
- valid validation configurations;
- content with complete translations.

Because SQL check constraints cannot query other rows, enforce this via publication RPC.

---

# 95. Domain Verification Workflow

For a domain-sensitive validation:

```text
Admin creates validation config
→ status unverified
→ links source reference
→ source_reviewed
→ optional expert review
→ expert_verified
→ use in published advanced educational content
```

Not every UI tooltip requires expert verification.

High-stakes numeric claims should.

---

# 96. Admin Audit Trigger Strategy

Do not automatically audit every row mutation with one giant generic trigger initially.

Preferred:

- publication/admin server operations explicitly write useful audit entries;
- audit important content changes;
- avoid storing huge binary/model metadata diffs.

If stricter audit requirements appear, add targeted triggers.

---

# 97. No Booking Tables

The product has no booking/scheduling functionality.

Do **not** add:

```text
appointments
availability_slots
bookings
reservations
calendars
```

They are unrelated to Prostheia.

---

# 98. No AI Tables

The current product has no AI feature.

Do **not** add:

```text
ai_chats
prompts
llm_runs
embeddings
ai_recommendations
```

unless a real future requirement exists.

---

# 99. No Gamification Tables

Do not add:

```text
xp
coins
streaks
leaderboards
badges
```

Practice progress is educational, not game progression.

---

# 100. Deferred Tables

Do not create unused tables until their features are actually scheduled.

Potential future additions:

```text
user_tooth_setup_presets
practice_lesson_versions
case_collaborators
expert_reviews
analytics_events
notifications
```

The current schema should not contain empty speculative systems.

---

# 101. Full Table Inventory

## Identity / Security

```text
public.profiles
app_private.user_roles
app_private.admin_audit_log
```

## Domain / Curriculum

```text
public.content_domains
public.skills
public.practice_modules
public.practice_lessons
public.lesson_prerequisites
public.practice_lesson_skills
public.practice_steps
public.practice_hints
```

## CAD Tools

```text
public.tool_definitions
public.tool_object_roles
public.practice_step_tools
public.tool_demos
```

## Evidence / Validation

```text
public.domain_references
public.validation_configs
public.validation_reference_links
public.practice_step_validations
public.practice_lesson_validations
public.lesson_domain_references
```

## Assets

```text
public.assets
public.model_assets
public.asset_licenses
public.practice_lesson_assets
```

## Material / Libraries

```text
public.material_presets
public.material_preset_references
public.tooth_sets
public.tooth_set_members
```

## Free Lab

```text
public.scenarios
public.scenario_assets
public.scenario_tools
public.scenario_validations
```

## CAD Projects

```text
public.user_cases
public.case_objects
public.case_object_versions
public.case_revisions
public.case_revision_objects
public.case_heads
public.case_checkpoints
```

## Practice Results

```text
public.practice_attempts
public.attempt_step_results
public.attempt_validation_results
public.user_lesson_progress
public.user_skill_progress
```

## Screenshots

```text
public.case_screenshots
public.screenshot_annotations
```

Total baseline application tables:

**40 tables** across `public` and `app_private`.

This count is intentionally large because the product combines:

- CAD projects;
- education;
- content management;
- geometric validation;
- progress;
- binary assets.

The schema avoids one giant JSON table while also avoiding over-normalizing every CAD runtime value.

---

# 102. Tables That Are Authoritative vs Derived

## Authoritative

```text
profiles
roles
content
assets
scenarios
user_cases
case_objects
case_object_versions
case_revisions
attempts
validation results
```

## Derived / cache

```text
user_lesson_progress
user_skill_progress
case_heads
```

Derived tables must be reconstructable from authoritative data if necessary.

---

# 103. Data That Must Stay Out of PostgreSQL

Do not persist:

- raw vertex buffers as JSON;
- every sculpt mousemove;
- every camera movement;
- frame-by-frame articulator state;
- temporary contact heatmaps;
- BVH trees;
- WebGL buffers;
- temporary selection masks;
- unsaved recovery snapshots.

Those belong in:

- browser runtime;
- Web Worker memory;
- IndexedDB;
- Storage for finalized geometry.

---

# 104. Data That Should Be Recomputed

Prefer recomputation for inexpensive/derived analysis such as:

- temporary contact colors;
- distance overlay;
- selected-object highlight;
- section clipping state.

Do not store every visual analysis output in the database.

Attempt validation results should store summarized measured results, not full per-vertex heatmaps unless a future requirement specifically needs them.

---

# 105. Data That Should Be Snapshotted

Snapshot data when later content edits must not rewrite history.

Examples:

- scenario/lesson source brief in `user_cases.source_snapshot`;
- validation messages in `attempt_validation_results`;
- final score and Design Check summary;
- revision object transform state.

---

# 106. Production Readiness Checklist

Before production:

- [ ] All public tables have RLS enabled.
- [ ] `anon` grants reviewed/revoked.
- [ ] Authenticated grants reviewed.
- [ ] RLS tests pass.
- [ ] `service_role` is not in client bundle.
- [ ] Admin role cannot be self-assigned.
- [ ] User-owned asset policies verified.
- [ ] Storage buckets are correctly private/public.
- [ ] Storage delete uses API, not direct SQL.
- [ ] Every RLS ownership filter is indexed.
- [ ] Publication RPC validates asset/license state.
- [ ] Save RPC validates case/object/version ownership.
- [ ] Progress cannot be arbitrarily modified by users.
- [ ] Account deletion cleans Storage and DB data.
- [ ] Staging migrations run from zero successfully.
- [ ] TypeScript database types regenerated.
- [ ] Seed data does not contain unlicensed 3D assets.

---

# 107. MVP Database Scope

For the first coherent MVP, the minimum subset to implement is:

## Required immediately

```text
profiles
user_roles

content_domains
skills

practice_modules
practice_lessons
practice_steps
practice_step_tools
practice_hints

tool_definitions
tool_object_roles

validation_configs
practice_step_validations
practice_lesson_validations

assets
model_assets

scenarios
scenario_assets

user_cases
case_objects
case_object_versions
case_revisions
case_revision_objects
case_heads

practice_attempts
attempt_step_results
attempt_validation_results
user_lesson_progress
user_skill_progress
```

## Can follow shortly after

```text
lesson_prerequisites
practice_lesson_skills
domain_references
validation_reference_links
asset_licenses
tool_demos
material_presets
scenario_tools
scenario_validations
practice_lesson_assets
tooth_sets
tooth_set_members
case_checkpoints
case_screenshots
screenshot_annotations
admin_audit_log
```

Important:

“MVP later” here is only migration/implementation order.

The schema architecture is already designed so these additions do not require replacing the core tables.

---

# 108. Final Database Architecture Statement

Prostheia's database is designed around four durable concepts:

## 1. Content

```text
Practice
Scenarios
Tools
Validation
Educational Assets
```

## 2. Users

```text
Identity
Role
Progress
Attempts
```

## 3. CAD Projects

```text
Case
Stable Objects
Immutable Geometry Versions
Save Revisions
Checkpoints
```

## 4. Binary Assets

```text
Supabase Storage
+
relational metadata / ownership in PostgreSQL
```

The key CAD storage rule is:

> **Transforms create revisions; mesh edits create geometry versions.**

This prevents unnecessary duplication while preserving reliable project history.

The key security rule is:

> **Every exposed row is protected by RLS, and every user-owned file is private by default.**

The key educational-content rule is:

> **Lessons, scenarios, tools and validation are configuration-driven and can be managed through Admin without hardcoding each exercise into the frontend.**

This schema is the baseline from which Supabase SQL migrations should be written.
