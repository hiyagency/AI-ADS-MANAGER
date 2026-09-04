-- Phase 3: operational client management for the HIY admin workspace.
--
-- Auth accounts are deliberately NOT created from the browser. Supabase Auth
-- users are provisioned in a trusted environment, then an active HIY admin can
-- attach their fail-closed profile to one client through client_users.

alter table public.profiles
  add column email text;

update public.profiles as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email is not null;

alter table public.profiles
  add constraint profiles_email_length check (
    email is null
    or char_length(btrim(email)) between 3 and 320
  );

create unique index profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;

alter table public.clients
  add column contact_name text,
  add column contact_email text,
  add column contact_phone text,
  add column offer_id uuid references public.offers (id) on delete set null,
  add constraint clients_contact_name_length check (
    contact_name is null
    or char_length(btrim(contact_name)) between 1 and 120
  ),
  add constraint clients_contact_email_length check (
    contact_email is null
    or char_length(btrim(contact_email)) between 3 and 320
  ),
  add constraint clients_contact_phone_length check (
    contact_phone is null
    or char_length(btrim(contact_phone)) between 5 and 40
  );

create index clients_offer_id_idx on public.clients (offer_id);
create index clients_status_name_idx on public.clients (status, name);

comment on column public.profiles.email is
  'Auth email mirrored for admin account assignment; maintained by trusted auth triggers.';
comment on column public.clients.offer_id is
  'Current package assigned to this client. Historical subscriptions arrive in a later phase.';
-- Keep the profile mirror in sync without trusting user-editable metadata for
-- role, status, or tenant membership.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

create or replace function private.handle_auth_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = lower(new.email)
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function private.handle_auth_user_email_update();

alter function private.handle_auth_user_email_update() owner to postgres;
revoke all on function private.handle_auth_user_email_update() from public, anon, authenticated;

-- Replace Phase 2's read-only browser grants with the narrowest write surface
-- required by the Phase 3 admin UI. RLS remains the authorization boundary.
revoke all on table public.profiles from authenticated;
revoke all on table public.clients from authenticated;
revoke all on table public.client_users from authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, status) on table public.profiles to authenticated;
grant select, insert, update on table public.clients to authenticated;
grant select, insert, delete on table public.client_users to authenticated;

create policy "Active admins can update client profiles"
on public.profiles
for update
to authenticated
using (
  (select private.is_active_admin())
  and role = 'client'
  and id <> (select auth.uid())
)
with check (
  (select private.is_active_admin())
  and role = 'client'
  and id <> (select auth.uid())
);

create policy "Active admins can create clients"
on public.clients
for insert
to authenticated
with check ((select private.is_active_admin()));

create policy "Active admins can update clients"
on public.clients
for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy "Active admins can attach client users"
on public.client_users
for insert
to authenticated
with check (
  (select private.is_active_admin())
  and exists (
    select 1
    from public.profiles as candidate
    where candidate.id = user_id
      and candidate.role = 'client'
  )
);

create policy "Active admins can detach client users"
on public.client_users
for delete
to authenticated
using ((select private.is_active_admin()));

-- Hard deletion is intentionally unavailable to browser sessions. Clients are
-- disabled instead, preserving offer assignments and later campaign history.
