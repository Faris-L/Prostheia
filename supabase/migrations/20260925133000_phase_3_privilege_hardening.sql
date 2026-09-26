-- Tighten grants inherited from project-level default privileges.
revoke all on table public.profiles from public, anon, authenticated;
grant select, update on table public.profiles to authenticated;

-- Keep the granted_by foreign key efficient for role-management operations.
create index user_roles_granted_by_idx
  on app_private.user_roles (granted_by);
