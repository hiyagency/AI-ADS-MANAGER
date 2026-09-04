-- HIY Meta Ads 31-day package catalog.
-- Values are transcribed from HIY_Meta_Ads_Client_Packages_31_Day.pdf.

create type public.offer_billing_type as enum ('monthly', 'one_time');

create table public.offer_catalogs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subtitle text not null,
  summary text not null,
  currency_code text not null default 'INR',
  cycle_days smallint not null,
  service_rate numeric(5, 2) not null,
  gst_rate numeric(5, 2) not null,
  basic_creative_price numeric(12, 2) not null,
  ai_manager_month_one_fee numeric(12, 2) not null default 0,
  ai_manager_recurring_fee numeric(12, 2) not null,
  recommended_testing_min_daily numeric(12, 2) not null,
  recommended_testing_max_daily numeric(12, 2) not null,
  recommendation text not null,
  scaling_note text not null,
  market_leadership_note text not null,
  month_one_note text not null,
  month_two_note text not null,
  client_features jsonb not null default '[]'::jsonb,
  operating_standards jsonb not null default '[]'::jsonb,
  commercial_terms jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_catalogs_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint offer_catalogs_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint offer_catalogs_cycle_days check (cycle_days between 1 and 366),
  constraint offer_catalogs_rates check (
    service_rate between 0 and 100
    and gst_rate between 0 and 100
  ),
  constraint offer_catalogs_non_negative_amounts check (
    basic_creative_price >= 0
    and ai_manager_month_one_fee >= 0
    and ai_manager_recurring_fee >= 0
    and recommended_testing_min_daily >= 0
    and recommended_testing_max_daily >= recommended_testing_min_daily
  ),
  constraint offer_catalogs_features_array check (jsonb_typeof(client_features) = 'array'),
  constraint offer_catalogs_standards_array check (jsonb_typeof(operating_standards) = 'array'),
  constraint offer_catalogs_terms_array check (jsonb_typeof(commercial_terms) = 'array')
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.offer_catalogs (id) on delete restrict,
  slug text not null unique,
  name text not null,
  category text not null,
  billing_type public.offer_billing_type not null default 'monthly',
  currency_code text not null default 'INR',
  cycle_days smallint not null default 31,
  daily_budget numeric(12, 2) not null,
  ad_budget numeric(12, 2) not null,
  service_rate numeric(5, 2) not null default 35,
  service_fee numeric(12, 2) not null,
  gst_rate numeric(5, 2) not null default 18,
  gst numeric(12, 2) not null,
  creative_unit_price numeric(12, 2) not null default 2000,
  included_creatives smallint not null default 1,
  creative_charge numeric(12, 2) not null,
  additional_charges numeric(12, 2) not null default 0,
  ai_manager_month_one_fee numeric(12, 2) not null default 0,
  ai_manager_recurring_fee numeric(12, 2) not null default 499,
  month_one_total numeric(12, 2) not null,
  month_two_base numeric(12, 2) not null,
  recommended_creatives smallint not null,
  recommended_month_one_total numeric(12, 2) not null,
  active boolean not null default true,
  is_public boolean not null default true,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint offers_slug_format check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint offers_category check (
    category in ('local_growth', 'scale', 'market_leadership')
  ),
  constraint offers_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint offers_cycle_days check (cycle_days between 1 and 366),
  constraint offers_non_negative_amounts check (
    daily_budget >= 0
    and ad_budget >= 0
    and service_fee >= 0
    and gst >= 0
    and creative_unit_price >= 0
    and creative_charge >= 0
    and additional_charges >= 0
    and ai_manager_month_one_fee >= 0
    and ai_manager_recurring_fee >= 0
    and month_one_total >= 0
    and month_two_base >= 0
    and recommended_month_one_total >= 0
  ),
  constraint offers_rates check (
    service_rate between 0 and 100
    and gst_rate between 0 and 100
  ),
  constraint offers_creative_counts check (
    included_creatives >= 1
    and recommended_creatives >= included_creatives
  ),
  constraint offers_ad_budget_formula check (
    ad_budget = daily_budget * cycle_days
  ),
  constraint offers_service_fee_formula check (
    service_fee = round(ad_budget * service_rate / 100, 2)
  ),
  constraint offers_gst_formula check (
    gst = round(ad_budget * gst_rate / 100, 2)
  ),
  constraint offers_creative_charge_formula check (
    creative_charge = creative_unit_price * included_creatives
  ),
  constraint offers_month_one_total_formula check (
    month_one_total = ad_budget
      + service_fee
      + gst
      + creative_charge
      + additional_charges
      + ai_manager_month_one_fee
  ),
  constraint offers_month_two_base_formula check (
    month_two_base = ad_budget
      + service_fee
      + gst
      + additional_charges
      + ai_manager_recurring_fee
  ),
  constraint offers_recommended_total_formula check (
    recommended_month_one_total = month_one_total
      + ((recommended_creatives - included_creatives) * creative_unit_price)
  )
);

create index offers_catalog_id_idx on public.offers (catalog_id);
create index offers_public_active_sort_idx
  on public.offers (sort_order)
  where active and is_public;

create trigger offer_catalogs_set_updated_at
before update on public.offer_catalogs
for each row execute function private.set_updated_at();

create trigger offers_set_updated_at
before update on public.offers
for each row execute function private.set_updated_at();

comment on table public.offer_catalogs is
  'Versioned commercial context and terms shared by a HIY offer catalog.';
comment on table public.offers is
  'Structured advertising packages with exact auditable pricing components.';
comment on column public.offers.month_two_base is
  'Media, service, GST, additional charges, and recurring AI Ads Manager fee; excludes a fresh creative.';

alter table public.offer_catalogs enable row level security;
alter table public.offers enable row level security;

revoke all on table public.offer_catalogs from anon, authenticated;
revoke all on table public.offers from anon, authenticated;

grant select on table public.offer_catalogs to anon;
grant select on table public.offers to anon;
grant select, insert, update, delete on table public.offer_catalogs to authenticated;
grant select, insert, update, delete on table public.offers to authenticated;
grant select, insert, update, delete on table public.offer_catalogs to service_role;
grant select, insert, update, delete on table public.offers to service_role;
grant usage on type public.offer_billing_type to anon, authenticated, service_role;

create policy "Anyone can view the active offer catalog"
on public.offer_catalogs
for select
to anon
using (active);

create policy "Authenticated users can view public catalogs and admins can view all"
on public.offer_catalogs
for select
to authenticated
using (active or (select private.is_active_admin()));

create policy "Active admins can create offer catalogs"
on public.offer_catalogs
for insert
to authenticated
with check ((select private.is_active_admin()));

create policy "Active admins can update offer catalogs"
on public.offer_catalogs
for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy "Active admins can delete offer catalogs"
on public.offer_catalogs
for delete
to authenticated
using ((select private.is_active_admin()));

create policy "Anyone can view active public offers"
on public.offers
for select
to anon
using (active and is_public);

create policy "Authenticated users can view public offers and admins can view all"
on public.offers
for select
to authenticated
using ((active and is_public) or (select private.is_active_admin()));

create policy "Active admins can create offers"
on public.offers
for insert
to authenticated
with check ((select private.is_active_admin()));

create policy "Active admins can update offers"
on public.offers
for update
to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy "Active admins can delete offers"
on public.offers
for delete
to authenticated
using ((select private.is_active_admin()));

insert into public.offer_catalogs (
  id,
  name,
  subtitle,
  summary,
  currency_code,
  cycle_days,
  service_rate,
  gst_rate,
  basic_creative_price,
  ai_manager_month_one_fee,
  ai_manager_recurring_fee,
  recommended_testing_min_daily,
  recommended_testing_max_daily,
  recommendation,
  scaling_note,
  market_leadership_note,
  month_one_note,
  month_two_note,
  client_features,
  operating_standards,
  commercial_terms
)
values (
  '31000000-0000-0000-0000-000000000001',
  'HIY Meta Ads Client Packages',
  '31-Day Local Performance Advertising Plans',
  'Media + Management + Creative + AI Tracking',
  'INR',
  31,
  35,
  18,
  2000,
  0,
  499,
  200,
  400,
  '₹200-₹400/day is the practical single-creative testing band for a Shahdol-only campaign. Above this level, budget scaling should be paired with more creative variants and/or broader geography to reduce ad fatigue.',
  'These plans should not simply push more money into the same ad. At higher spend, HIY should rotate multiple creatives, watch frequency, and expand geography when local demand starts saturating.',
  'These plans are intended for businesses with sufficient demand, fast lead handling, strong offers, and enough geographic coverage. Shahdol-only campaigns at these budgets require aggressive creative rotation and performance monitoring.',
  'Month 1 total includes media, 35% service fee, 18% GST on media, one ₹2,000 basic creative, and AI Ads Manager at ₹0.',
  'Month 2 base includes media, service fee, GST, and ₹499 AI Ads Manager. New creative production is additional if required.',
  jsonb_build_array(
    'Central campaign visibility for HIY-managed Meta Ads.',
    'Tracking view for spend, messaging conversations, calls and campaign-level performance metrics where available.',
    '7-day, 14-day, 28-day and lifetime performance views as the system is configured for the account.',
    'Clear separation of media spend, HIY management fee, creative production and client package value.',
    'A cleaner client reporting experience without requiring the client to operate Meta Ads Manager directly.'
  ),
  jsonb_build_array(
    jsonb_build_object('title', 'One objective per campaign', 'detail', 'Do not split a small local budget across WhatsApp, Instagram DM and Calls at the same time.'),
    jsonb_build_object('title', 'Offer-led creative', 'detail', 'Promote a specific service, offer, product, admission action, appointment, catalogue or store-visit reason.'),
    jsonb_build_object('title', '7-day checkpoint', 'detail', 'HIY evaluates cost per conversation, meaningful call, qualified lead and final business outcome.'),
    jsonb_build_object('title', 'Scale only on evidence', 'detail', 'Increase spend only when qualified lead cost and audience frequency remain commercially healthy.')
  ),
  jsonb_build_array(
    'Pricing cycle: 31 consecutive days unless a different campaign period is agreed in writing.',
    'Ad spend is the planned media budget for Meta platforms. Actual platform delivery can vary slightly because of billing, pausing, account limits or campaign changes.',
    'Service fee: 35% of the planned 31-day ad spend.',
    'GST shown in this proposal: 18% calculated only on the 31-day ad spend.',
    'Creative fee: starts from ₹2,000 for one basic video. Advanced shoots, actors, UGC, studio production, motion graphics, premium edits, multiple locations or additional variants are extra.',
    'AI Ads Manager: ₹0 for the first month. From Month 2 onward it is ₹499/month onwards unless included in a separately negotiated retainer.',
    'Month 2 base figures do not include a fresh creative. If the campaign requires new creative production, it is added separately.',
    'Lead volume, sales, appointments, admissions, revenue and ROAS are not guaranteed. Results depend on offer strength, targeting, creative quality, seasonality, competition, response speed and client-side sales handling.',
    'For Shahdol-only targeting, higher daily budgets can saturate the audience. HIY may recommend additional creatives, expanded radius or nearby-market targeting before scaling.',
    'Final media launch is subject to Meta account access, payment method availability, policy approval and complete client assets.'
  )
);

insert into public.offers (
  id,
  catalog_id,
  slug,
  name,
  category,
  daily_budget,
  ad_budget,
  service_fee,
  gst,
  creative_charge,
  month_one_total,
  month_two_base,
  recommended_creatives,
  recommended_month_one_total,
  sort_order
)
values
  ('31000000-0000-0000-0000-000000000200', '31000000-0000-0000-0000-000000000001', 'local-starter', 'Local Starter', 'local_growth', 200, 6200, 2170, 1116, 2000, 11486, 9985, 1, 11486, 1),
  ('31000000-0000-0000-0000-000000000400', '31000000-0000-0000-0000-000000000001', 'local-growth', 'Local Growth', 'local_growth', 400, 12400, 4340, 2232, 2000, 20972, 19471, 1, 20972, 2),
  ('31000000-0000-0000-0000-000000000600', '31000000-0000-0000-0000-000000000001', 'performance', 'Performance', 'local_growth', 600, 18600, 6510, 3348, 2000, 30458, 28957, 2, 32458, 3),
  ('31000000-0000-0000-0000-000000000800', '31000000-0000-0000-0000-000000000001', 'scale', 'Scale', 'scale', 800, 24800, 8680, 4464, 2000, 39944, 38443, 3, 43944, 4),
  ('31000000-0000-0000-0000-000000000950', '31000000-0000-0000-0000-000000000001', 'accelerate', 'Accelerate', 'scale', 950, 29450, 10307.50, 5301, 2000, 47058.50, 45557.50, 3, 51058.50, 5),
  ('31000000-0000-0000-0000-000000001250', '31000000-0000-0000-0000-000000000001', 'market-leader', 'Market Leader', 'market_leadership', 1250, 38750, 13562.50, 6975, 2000, 61287.50, 59786.50, 4, 67287.50, 6),
  ('31000000-0000-0000-0000-000000001500', '31000000-0000-0000-0000-000000000001', 'market-dominance', 'Market Dominance', 'market_leadership', 1500, 46500, 16275, 8370, 2000, 73145, 71644, 5, 81145, 7);
