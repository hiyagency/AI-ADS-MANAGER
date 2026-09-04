begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(50);

-- Schema security and grants.
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.clients'::regclass),
  'clients has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.client_users'::regclass),
  'client_users has RLS enabled'
);

select ok(not has_table_privilege('anon', 'public.profiles', 'select'), 'anon cannot select profiles');
select ok(not has_table_privilege('anon', 'public.clients', 'select'), 'anon cannot select clients');
select ok(not has_table_privilege('anon', 'public.client_users', 'select'), 'anon cannot select memberships');
select ok(has_table_privilege('authenticated', 'public.profiles', 'select'), 'authenticated can select profiles');
select ok(has_table_privilege('authenticated', 'public.clients', 'select'), 'authenticated can select clients');
select ok(has_table_privilege('authenticated', 'public.client_users', 'select'), 'authenticated can select memberships');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'insert'), 'authenticated cannot insert profiles');
select ok(has_table_privilege('authenticated', 'public.clients', 'update'), 'authenticated receives the client update grant governed by RLS');
select ok(has_table_privilege('authenticated', 'public.client_users', 'delete'), 'authenticated receives the membership delete grant governed by RLS');

select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon cannot use private helpers');
select ok(has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated can resolve approved helpers');
select ok(
  has_function_privilege('authenticated', 'private.is_active_admin()', 'execute'),
  'authenticated can execute the admin helper'
);
select ok(
  not has_function_privilege('anon', 'private.can_access_client(uuid)', 'execute'),
  'anon cannot execute the tenant helper'
);
select is(
  (select count(*)::integer from pg_catalog.pg_policies where schemaname = 'public'),
  30,
  'all Phase 2 through Phase 7 tables have the expected explicit policies'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.client_users'::regclass
      and conname = 'client_users_one_tenant_per_user'
      and contype = 'u'
  ),
  'a client login is limited to one tenant'
);

-- Auth fixtures. The production trigger must create fail-closed profiles.
insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-00000000a001', 'authenticated', 'authenticated', 'admin@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-00000000a002', 'authenticated', 'authenticated', 'client-a@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-00000000a003', 'authenticated', 'authenticated', 'client-b@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-00000000a004', 'authenticated', 'authenticated', 'disabled-admin@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-00000000a005', 'authenticated', 'authenticated', 'disabled-tenant@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

select is((select count(*) from public.profiles), 5::bigint, 'the auth trigger creates every profile');
select is(
  (select count(*) from public.profiles where role = 'client' and status = 'disabled'),
  5::bigint,
  'new profiles default to a disabled client role'
);

update public.profiles
set role = 'admin', status = 'active'
where id = '00000000-0000-0000-0000-00000000a001';

update public.profiles
set status = 'active'
where id in (
  '00000000-0000-0000-0000-00000000a002',
  '00000000-0000-0000-0000-00000000a003',
  '00000000-0000-0000-0000-00000000a005'
);

update public.profiles
set role = 'admin'
where id = '00000000-0000-0000-0000-00000000a004';

insert into public.clients (id, name, slug, status)
values
  ('10000000-0000-0000-0000-00000000c001', 'Client A', 'client-a', 'active'),
  ('10000000-0000-0000-0000-00000000c002', 'Client B', 'client-b', 'active'),
  ('10000000-0000-0000-0000-00000000c003', 'Disabled Client', 'disabled-client', 'disabled');

insert into public.client_users (client_id, user_id)
values
  ('10000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000a002'),
  ('10000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000a003'),
  ('10000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-00000000a005');

-- Client A can see only its own active tenant and membership.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated"}';

select is((select count(*) from public.profiles), 1::bigint, 'Client A sees one profile');
select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000a002'),
  1::bigint,
  'Client A sees its own profile'
);
select is((select count(*) from public.clients), 1::bigint, 'Client A sees one client');
select is(
  (select count(*) from public.clients where id = '10000000-0000-0000-0000-00000000c001'),
  1::bigint,
  'Client A sees its assigned tenant'
);
select is(
  (select count(*) from public.clients where id = '10000000-0000-0000-0000-00000000c002'),
  0::bigint,
  'Client A cannot see Client B directly'
);
select is((select count(*) from public.client_users), 1::bigint, 'Client A sees one membership');
select is(
  (
    select count(*)
    from public.client_users as membership
    join public.clients as client on client.id = membership.client_id
    where client.id = '10000000-0000-0000-0000-00000000c002'
  ),
  0::bigint,
  'Client A cannot reach Client B through a join'
);
select is(
  private.can_access_client('10000000-0000-0000-0000-00000000c001'),
  true,
  'Client A helper access succeeds for its tenant'
);
select is(
  private.can_access_client('10000000-0000-0000-0000-00000000c002'),
  false,
  'Client A helper access fails for Client B'
);
with changed as (
  update public.clients set name = 'Blocked own edit'
  where id = '10000000-0000-0000-0000-00000000c001'
  returning 1
)
select is(
  (select count(*) from changed),
  0::bigint,
  'Client A cannot update its own client record'
);
with changed as (
  update public.clients set name = 'Blocked cross-tenant edit'
  where id = '10000000-0000-0000-0000-00000000c002'
  returning 1
)
select is(
  (select count(*) from changed),
  0::bigint,
  'Client A cannot update Client B'
);
with removed as (
  delete from public.client_users
  where user_id = '00000000-0000-0000-0000-00000000a002'
  returning 1
)
select is(
  (select count(*) from removed),
  0::bigint,
  'Client A cannot detach its own membership'
);
with changed as (
  update public.profiles set status = 'disabled'
  where id = '00000000-0000-0000-0000-00000000a002'
  returning 1
)
select is(
  (select count(*) from changed),
  0::bigint,
  'Client A cannot update its own authorization profile'
);

-- A disabled admin is not an admin for authorization purposes.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a004';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a004","role":"authenticated"}';

select is((select count(*) from public.profiles), 1::bigint, 'a disabled admin sees only its own profile');
select is((select count(*) from public.clients), 0::bigint, 'a disabled admin sees no clients');
select is((select count(*) from public.client_users), 0::bigint, 'a disabled admin sees no memberships');
select is(private.is_active_admin(), false, 'a disabled admin fails the admin helper');

-- An active profile assigned to a disabled tenant still exposes no tenant data.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a005';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a005","role":"authenticated"}';

select is((select count(*) from public.profiles), 1::bigint, 'a disabled-tenant user sees its own profile');
select is((select count(*) from public.clients), 0::bigint, 'a disabled tenant is hidden');
select is((select count(*) from public.client_users), 0::bigint, 'a disabled tenant also hides its membership');
select is(
  private.can_access_client('10000000-0000-0000-0000-00000000c003'),
  false,
  'the tenant helper denies a disabled tenant'
);

-- An active admin can inspect every tenant record for future administration.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}';

select is((select count(*) from public.profiles), 5::bigint, 'an active admin sees all profiles');
select is((select count(*) from public.clients), 3::bigint, 'an active admin sees all clients');
select is((select count(*) from public.client_users), 3::bigint, 'an active admin sees all memberships');
select is(
  (select count(*) from public.clients where status = 'disabled'),
  1::bigint,
  'an active admin can inspect disabled clients'
);
select is(private.is_active_admin(), true, 'an active admin passes the admin helper');
select is(
  private.can_access_client('10000000-0000-0000-0000-00000000c002'),
  true,
  'an active admin can access any tenant'
);
with created as (
  insert into public.clients (id, name, slug)
  values ('10000000-0000-0000-0000-00000000c004', 'Admin-created Client', 'admin-created-client')
  returning 1
)
select is(
  (select count(*) from created),
  1::bigint,
  'an active admin can create a client'
);
with changed as (
  update public.clients
  set offer_id = '31000000-0000-0000-0000-000000000400'
  where id = '10000000-0000-0000-0000-00000000c001'
  returning 1
)
select is(
  (select count(*) from changed),
  1::bigint,
  'an active admin can assign an offer to a client'
);
with changed as (
  update public.offers
  set is_public = false
  where id = '31000000-0000-0000-0000-000000000400'
  returning 1
)
select is(
  (select count(*) from changed),
  1::bigint,
  'an active admin can change offer visibility'
);

reset role;
select * from finish();
rollback;
