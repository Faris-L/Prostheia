-- Phase 3: identity, profiles, and trusted application roles.
-- User roles are deliberately kept outside the API-exposed public schema.

create schema if not exists app_private authorization postgres;
revoke all on schema app_private from public, anon, authenticated;

create type app_private.app_role as enum ('user', 'admin');
create type public.app_locale as enum ('en', 'sr');
create type public.app_theme as enum ('system', 'light', 'dark');

create table app_private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role app_private.app_role not null default 'user',
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_private.user_roles enable row level security;
revoke all on table app_private.user_roles from public, anon, authenticated;

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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.user_roles as ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'admin'::app_private.app_role
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

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

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_roles_set_updated_at
before update on app_private.user_roles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), '')
  );

  -- Ignore client-provided metadata for roles. New accounts are always users.
  insert into app_private.user_roles (user_id, role)
  values (new.id, 'user'::app_private.app_role);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon;
grant select, update on table public.profiles to authenticated;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select public.is_admin())
);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
