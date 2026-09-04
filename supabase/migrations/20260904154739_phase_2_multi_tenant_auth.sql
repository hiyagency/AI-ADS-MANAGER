-- Phase 2: Supabase authentication and multi-tenant authorization foundation.
--
-- Authorization is intentionally stored in live database rows. Browser route
-- guards are only a user-experience layer; these grants and RLS policies are
-- the security boundary.

create schema if not exists private;

comment on schema private is
  'Non-exposed authorization and trigger helpers for the HIY Ads Manager.';

revoke all on schema private from public;

create type public.app_role as enum ('admin', 'client');
create type public.entity_status as enum ('active', 'disabled');

-- Do not automatically expose objects added by later migrations. Every future
-- public table/function must receive deliberate grants alongside its RLS policy.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role public.app_role not null default 'client',
  status public.entity_status not null default 'disabled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null
    or char_length(btrim(display_name)) between 1 and 120
  )
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_length check (
    char_length(btrim(name)) between 1 and 160
  ),
  constraint clients_slug_format check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create table public.client_users (
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id),
  constraint client_users_one_tenant_per_user unique (user_id)
);

-- The primary key indexes client_id; the one-tenant constraint indexes user_id.
create index profiles_active_role_idx
  on public.profiles (role)
  where status = 'active';

comment on table public.profiles is
  'Authorization profile for each Supabase Auth user. New profiles fail closed.';
comment on table public.clients is
  'Tenant identities for HIY client accounts.';
comment on table public.client_users is
  'One tenant membership per client login; a client can have multiple users.';

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function private.set_updated_at();

-- The trigger never trusts user-editable metadata for role or tenant access.
-- Every Auth user starts as a disabled client until explicitly provisioned.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- Security-definer helpers live outside the Data API's exposed schemas. Their
-- empty search_path and fully-qualified references prevent object shadowing.
create or replace function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.role = 'admin'
      and profile.status = 'active'
  );
$$;

create or replace function private.can_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_active_admin())
    or exists (
      select 1
      from public.profiles as profile
      inner join public.client_users as membership
        on membership.user_id = profile.id
      inner join public.clients as client
        on client.id = membership.client_id
      where profile.id = (select auth.uid())
        and profile.role = 'client'
        and profile.status = 'active'
        and membership.client_id = target_client_id
        and client.status = 'active'
    );
$$;

alter function private.set_updated_at() owner to postgres;
alter function private.handle_new_auth_user() owner to postgres;
alter function private.is_active_admin() owner to postgres;
alter function private.can_access_client(uuid) owner to postgres;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
revoke all on function private.is_active_admin() from public, anon, authenticated;
revoke all on function private.can_access_client(uuid) from public, anon, authenticated;

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_active_admin() to authenticated, service_role;
grant execute on function private.can_access_client(uuid) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_users enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.client_users from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.clients to authenticated;
grant select on table public.client_users to authenticated;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.clients to service_role;
grant select, insert, update, delete on table public.client_users to service_role;

grant usage on type public.app_role to authenticated, service_role;
grant usage on type public.entity_status to authenticated, service_role;

create policy "Users can view their own profile or admins can view all profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_active_admin())
);

create policy "Active users can view their tenant or admins can view all clients"
on public.clients
for select
to authenticated
using ((select private.can_access_client(id)));

create policy "Active users can view their membership or admins can view all memberships"
on public.client_users
for select
to authenticated
using (
  (select private.is_active_admin())
  or (
    user_id = (select auth.uid())
    and (select private.can_access_client(client_id))
  )
);

-- Future tenant-owned tables must include a non-null client_id foreign key and
-- use private.can_access_client(client_id) in every tenant-facing RLS policy.
