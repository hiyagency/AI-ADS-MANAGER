-- Phase 4: versioned commercial offers, immutable client price snapshots,
-- and a recoverable manual payment ledger.

create type public.offer_kind as enum ('standard', 'custom');
create type public.client_offer_status as enum ('draft', 'active', 'completed', 'cancelled');
create type public.payment_entry_status as enum ('recorded', 'voided');
create type public.payment_method as enum ('bank_transfer', 'upi', 'cash', 'card', 'other');

alter table public.offers
  add column description text not null default '',
  add column offer_kind public.offer_kind not null default 'standard',
  add column source_offer_id uuid references public.offers (id) on delete set null,
  add column version integer not null default 1,
  add column archived_at timestamptz,
  add constraint offers_description_length check (char_length(description) <= 1000),
  add constraint offers_version_positive check (version >= 1),
  add constraint offers_archive_state check (archived_at is null or not active);

comment on column public.offers.version is
  'Incremented whenever commercial pricing or package identity changes.';
comment on column public.offers.source_offer_id is
  'Original package when an administrator duplicates a standard or custom offer.';

create or replace function private.bump_offer_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.name,
    new.category,
    new.billing_type,
    new.currency_code,
    new.cycle_days,
    new.daily_budget,
    new.ad_budget,
    new.service_rate,
    new.service_fee,
    new.gst_rate,
    new.gst,
    new.creative_unit_price,
    new.included_creatives,
    new.creative_charge,
    new.additional_charges,
    new.ai_manager_month_one_fee,
    new.ai_manager_recurring_fee,
    new.month_one_total,
    new.month_two_base,
    new.recommended_creatives,
    new.recommended_month_one_total,
    new.description
  ) is distinct from row(
    old.name,
    old.category,
    old.billing_type,
    old.currency_code,
    old.cycle_days,
    old.daily_budget,
    old.ad_budget,
    old.service_rate,
    old.service_fee,
    old.gst_rate,
    old.gst,
    old.creative_unit_price,
    old.included_creatives,
    old.creative_charge,
    old.additional_charges,
    old.ai_manager_month_one_fee,
    old.ai_manager_recurring_fee,
    old.month_one_total,
    old.month_two_base,
    old.recommended_creatives,
    old.recommended_month_one_total,
    old.description
  ) then
    new.version := old.version + 1;
  else
    new.version := old.version;
  end if;

  return new;
end;
$$;

create trigger offers_bump_version
before update on public.offers
for each row execute function private.bump_offer_version();

alter function private.bump_offer_version() owner to postgres;
revoke all on function private.bump_offer_version() from public, anon, authenticated;

create table public.client_offers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  source_offer_id uuid references public.offers (id) on delete set null,
  source_offer_version integer,
  name text not null,
  description text not null default '',
  offer_kind public.offer_kind not null default 'standard',
  billing_type public.offer_billing_type not null default 'monthly',
  currency_code text not null default 'INR',
  cycle_days smallint not null,
  daily_budget numeric(12, 2) not null,
  ad_budget numeric(12, 2) not null,
  service_rate numeric(5, 2) not null,
  service_fee numeric(12, 2) not null,
  gst_rate numeric(5, 2) not null,
  gst numeric(12, 2) not null,
  creative_unit_price numeric(12, 2) not null,
  included_creatives smallint not null,
  creative_charge numeric(12, 2) not null,
  ai_manager_fee numeric(12, 2) not null default 0,
  additional_charges numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  gross_total numeric(12, 2) not null,
  total numeric(12, 2) not null,
  status public.client_offer_status not null default 'active',
  starts_on date not null default current_date,
  ends_on date not null,
  notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_offers_identity_length check (
    char_length(btrim(name)) between 1 and 160
    and char_length(description) <= 1000
    and char_length(notes) <= 2000
  ),
  constraint client_offers_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint client_offers_cycle_days check (cycle_days between 1 and 366),
  constraint client_offers_dates check (ends_on = starts_on + (cycle_days - 1)),
  constraint client_offers_source_version check (
    (source_offer_id is null and source_offer_version is null)
    or (source_offer_id is not null and source_offer_version is not null and source_offer_version >= 1)
  ),
  constraint client_offers_rates check (
    service_rate between 0 and 100
    and gst_rate between 0 and 100
  ),
  constraint client_offers_non_negative_amounts check (
    daily_budget >= 0
    and ad_budget >= 0
    and service_fee >= 0
    and gst >= 0
    and creative_unit_price >= 0
    and included_creatives >= 0
    and creative_charge >= 0
    and ai_manager_fee >= 0
    and additional_charges >= 0
    and discount >= 0
    and gross_total >= 0
    and total >= 0
  ),
  constraint client_offers_ad_budget_formula check (
    ad_budget = round(daily_budget * cycle_days, 2)
  ),
  constraint client_offers_service_fee_formula check (
    service_fee = round(ad_budget * service_rate / 100, 2)
  ),
  constraint client_offers_gst_formula check (
    gst = round(ad_budget * gst_rate / 100, 2)
  ),
  constraint client_offers_creative_charge_formula check (
    creative_charge = round(creative_unit_price * included_creatives, 2)
  ),
  constraint client_offers_gross_total_formula check (
    gross_total = ad_budget
      + service_fee
      + gst
      + creative_charge
      + ai_manager_fee
      + additional_charges
  ),
  constraint client_offers_total_formula check (total = gross_total - discount),
  constraint client_offers_discount_limit check (discount <= gross_total),
  constraint client_offers_id_client_unique unique (id, client_id)
);

create unique index client_offers_one_active_per_client_idx
  on public.client_offers (client_id)
  where status = 'active';
create index client_offers_client_created_idx
  on public.client_offers (client_id, created_at desc);
create index client_offers_source_offer_idx
  on public.client_offers (source_offer_id)
  where source_offer_id is not null;

create trigger client_offers_set_updated_at
before update on public.client_offers
for each row execute function private.set_updated_at();

create or replace function private.prevent_client_offer_pricing_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.client_id,
    new.source_offer_id,
    new.source_offer_version,
    new.name,
    new.description,
    new.offer_kind,
    new.billing_type,
    new.currency_code,
    new.cycle_days,
    new.daily_budget,
    new.ad_budget,
    new.service_rate,
    new.service_fee,
    new.gst_rate,
    new.gst,
    new.creative_unit_price,
    new.included_creatives,
    new.creative_charge,
    new.ai_manager_fee,
    new.additional_charges,
    new.discount,
    new.gross_total,
    new.total,
    new.starts_on,
    new.ends_on,
    new.created_by,
    new.created_at
  ) is distinct from row(
    old.client_id,
    old.source_offer_id,
    old.source_offer_version,
    old.name,
    old.description,
    old.offer_kind,
    old.billing_type,
    old.currency_code,
    old.cycle_days,
    old.daily_budget,
    old.ad_budget,
    old.service_rate,
    old.service_fee,
    old.gst_rate,
    old.gst,
    old.creative_unit_price,
    old.included_creatives,
    old.creative_charge,
    old.ai_manager_fee,
    old.additional_charges,
    old.discount,
    old.gross_total,
    old.total,
    old.starts_on,
    old.ends_on,
    old.created_by,
    old.created_at
  ) then
    raise exception 'Assigned commercial pricing is immutable; create a new client offer instead.';
  end if;

  return new;
end;
$$;

create trigger client_offers_prevent_pricing_mutation
before update on public.client_offers
for each row execute function private.prevent_client_offer_pricing_mutation();

alter function private.prevent_client_offer_pricing_mutation() owner to postgres;
revoke all on function private.prevent_client_offer_pricing_mutation() from public, anon, authenticated;

create table public.payment_entries (
  id uuid primary key default gen_random_uuid(),
  client_offer_id uuid not null,
  client_id uuid not null references public.clients (id) on delete restrict,
  amount numeric(12, 2) not null,
  paid_on date not null default current_date,
  method public.payment_method not null default 'bank_transfer',
  reference text,
  notes text not null default '',
  status public.payment_entry_status not null default 'recorded',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_entries_offer_client_fkey
    foreign key (client_offer_id, client_id)
    references public.client_offers (id, client_id)
    on delete restrict,
  constraint payment_entries_amount_positive check (amount > 0),
  constraint payment_entries_reference_length check (
    reference is null or char_length(btrim(reference)) between 1 and 160
  ),
  constraint payment_entries_notes_length check (char_length(notes) <= 1000)
);

create index payment_entries_offer_paid_idx
  on public.payment_entries (client_offer_id, paid_on desc, created_at desc);
create index payment_entries_client_paid_idx
  on public.payment_entries (client_id, paid_on desc);

create trigger payment_entries_set_updated_at
before update on public.payment_entries
for each row execute function private.set_updated_at();

create or replace function private.protect_payment_ledger()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  offer_total numeric(12, 2);
  paid_total numeric(12, 2);
begin
  if tg_op = 'UPDATE' and row(
    new.client_offer_id,
    new.client_id,
    new.amount,
    new.paid_on,
    new.method,
    new.reference,
    new.created_by,
    new.created_at
  ) is distinct from row(
    old.client_offer_id,
    old.client_id,
    old.amount,
    old.paid_on,
    old.method,
    old.reference,
    old.created_by,
    old.created_at
  ) then
    raise exception 'Recorded payment facts are immutable; void the entry and record a replacement.';
  end if;

  if new.status = 'recorded' and (tg_op = 'INSERT' or old.status = 'voided') then
    select assignment.total
    into offer_total
    from public.client_offers as assignment
    where assignment.id = new.client_offer_id
      and assignment.client_id = new.client_id
    for update;

    select coalesce(sum(entry.amount), 0)
    into paid_total
    from public.payment_entries as entry
    where entry.client_offer_id = new.client_offer_id
      and entry.status = 'recorded'
      and (tg_op = 'INSERT' or entry.id <> new.id);

    if paid_total + new.amount > offer_total then
      raise exception 'Recorded payments cannot exceed the assigned offer total.';
    end if;
  end if;

  return new;
end;
$$;

create trigger payment_entries_protect_ledger
before insert or update on public.payment_entries
for each row execute function private.protect_payment_ledger();

alter function private.protect_payment_ledger() owner to postgres;
revoke all on function private.protect_payment_ledger() from public, anon, authenticated;

comment on table public.client_offers is
  'Immutable commercial snapshots assigned to clients; later offer edits never rewrite history.';
comment on table public.payment_entries is
  'Append-only manual payment ledger. Corrections are represented by voiding and replacing an entry.';

alter table public.client_offers enable row level security;
alter table public.payment_entries enable row level security;

revoke all on table public.client_offers from anon, authenticated;
revoke all on table public.payment_entries from anon, authenticated;
revoke delete on table public.offers from authenticated;

grant select, insert, update on table public.client_offers to authenticated;
grant select, insert, update on table public.payment_entries to authenticated;
grant select, insert, update, delete on table public.client_offers to service_role;
grant select, insert, update, delete on table public.payment_entries to service_role;
grant usage on type public.offer_kind to authenticated, service_role;
grant usage on type public.client_offer_status to authenticated, service_role;
grant usage on type public.payment_entry_status to authenticated, service_role;
grant usage on type public.payment_method to authenticated, service_role;

drop policy "Active admins can delete offers" on public.offers;

create policy "Clients can view their commercial history and admins can view all"
on public.client_offers
for select
to authenticated
using ((select private.can_access_client(client_id)));

create policy "Active admins can assign client offers"
on public.client_offers
for insert
to authenticated
with check ((select private.is_active_admin()));

create policy "Active admins can update assignment state"
on public.client_offers
for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy "Clients can view their payments and admins can view all"
on public.payment_entries
for select
to authenticated
using ((select private.can_access_client(client_id)));

create policy "Active admins can record payments"
on public.payment_entries
for insert
to authenticated
with check ((select private.is_active_admin()));

create policy "Active admins can void payments"
on public.payment_entries
for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

-- Close the previous active assignment and create its replacement atomically.
-- This function is security invoker: RLS and the caller's grants still apply.
create or replace function public.assign_client_offer(
  p_client_id uuid,
  p_source_offer_id uuid,
  p_name text,
  p_description text,
  p_offer_kind public.offer_kind,
  p_billing_type public.offer_billing_type,
  p_currency_code text,
  p_cycle_days smallint,
  p_daily_budget numeric,
  p_ad_budget numeric,
  p_service_rate numeric,
  p_service_fee numeric,
  p_gst_rate numeric,
  p_gst numeric,
  p_creative_unit_price numeric,
  p_included_creatives smallint,
  p_creative_charge numeric,
  p_ai_manager_fee numeric,
  p_additional_charges numeric,
  p_discount numeric,
  p_gross_total numeric,
  p_total numeric,
  p_starts_on date,
  p_notes text
)
returns public.client_offers
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  assigned public.client_offers;
  source_version integer;
begin
  if not (select private.is_active_admin()) then
    raise exception 'Only an active HIY administrator can assign an offer.';
  end if;

  if p_source_offer_id is not null then
    select offer.version
    into source_version
    from public.offers as offer
    where offer.id = p_source_offer_id;

    if source_version is null then
      raise exception 'The selected source offer does not exist.';
    end if;
  end if;

  update public.client_offers
  set status = 'completed'
  where client_id = p_client_id
    and status = 'active';

  insert into public.client_offers (
    client_id,
    source_offer_id,
    source_offer_version,
    name,
    description,
    offer_kind,
    billing_type,
    currency_code,
    cycle_days,
    daily_budget,
    ad_budget,
    service_rate,
    service_fee,
    gst_rate,
    gst,
    creative_unit_price,
    included_creatives,
    creative_charge,
    ai_manager_fee,
    additional_charges,
    discount,
    gross_total,
    total,
    status,
    starts_on,
    ends_on,
    notes
  ) values (
    p_client_id,
    p_source_offer_id,
    source_version,
    p_name,
    p_description,
    p_offer_kind,
    p_billing_type,
    p_currency_code,
    p_cycle_days,
    p_daily_budget,
    p_ad_budget,
    p_service_rate,
    p_service_fee,
    p_gst_rate,
    p_gst,
    p_creative_unit_price,
    p_included_creatives,
    p_creative_charge,
    p_ai_manager_fee,
    p_additional_charges,
    p_discount,
    p_gross_total,
    p_total,
    'active',
    p_starts_on,
    p_starts_on + (p_cycle_days - 1),
    p_notes
  )
  returning * into assigned;

  update public.clients
  set offer_id = p_source_offer_id
  where id = p_client_id;

  return assigned;
end;
$$;

revoke all on function public.assign_client_offer(
  uuid, uuid, text, text, public.offer_kind, public.offer_billing_type,
  text, smallint, numeric, numeric, numeric, numeric, numeric, numeric,
  numeric, smallint, numeric, numeric, numeric, numeric, numeric, numeric,
  date, text
) from public, anon;
grant execute on function public.assign_client_offer(
  uuid, uuid, text, text, public.offer_kind, public.offer_billing_type,
  text, smallint, numeric, numeric, numeric, numeric, numeric, numeric,
  numeric, smallint, numeric, numeric, numeric, numeric, numeric, numeric,
  date, text
) to authenticated, service_role;
