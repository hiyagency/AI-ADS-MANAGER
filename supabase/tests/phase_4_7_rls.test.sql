begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(41);

-- New exposed tables must be protected before any tenant fixtures are added.
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.client_offers'::regclass), 'client_offers has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.payment_entries'::regclass), 'payment_entries has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.meta_accounts'::regclass), 'meta_accounts has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.campaigns'::regclass), 'campaigns has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.ad_sets'::regclass), 'ad_sets has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.ads'::regclass), 'ads has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.daily_metrics'::regclass), 'daily_metrics has RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.sync_logs'::regclass), 'sync_logs has RLS');
select ok(not has_table_privilege('anon', 'public.client_offers', 'select'), 'anon cannot read assignments');
select ok(not has_table_privilege('anon', 'public.daily_metrics', 'select'), 'anon cannot read metrics');
select ok(has_table_privilege('authenticated', 'public.client_offers', 'select'), 'authenticated can read assignments through RLS');
select ok(has_table_privilege('authenticated', 'public.daily_metrics', 'select'), 'authenticated can read metrics through RLS');
select ok(not has_table_privilege('authenticated', 'public.offers', 'delete'), 'browser sessions cannot hard-delete offers');
select ok(not has_table_privilege('authenticated', 'public.daily_metrics', 'insert'), 'browser sessions cannot insert Meta metrics');
select ok(
  has_function_privilege(
    'authenticated',
    'public.assign_client_offer(uuid,uuid,text,text,public.offer_kind,public.offer_billing_type,text,smallint,numeric,numeric,numeric,numeric,numeric,numeric,numeric,smallint,numeric,numeric,numeric,numeric,numeric,numeric,date,text)',
    'execute'
  ),
  'authenticated admins can call the RLS-bound assignment function'
);
select is(
  (select prosecdef from pg_catalog.pg_proc where oid = 'public.assign_client_offer(uuid,uuid,text,text,public.offer_kind,public.offer_billing_type,text,smallint,numeric,numeric,numeric,numeric,numeric,numeric,numeric,smallint,numeric,numeric,numeric,numeric,numeric,numeric,date,text)'::regprocedure),
  false,
  'assignment function is security invoker'
);
select is(
  (select count(*) from information_schema.columns where table_schema = 'public' and column_name = 'access_token'),
  0::bigint,
  'the exposed schema stores no access token'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-00000000b001', 'authenticated', 'authenticated', 'phase4-admin@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-00000000b002', 'authenticated', 'authenticated', 'phase4-client-a@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-00000000b003', 'authenticated', 'authenticated', 'phase4-client-b@test.local', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

update public.profiles set role = 'admin', status = 'active' where id = '00000000-0000-0000-0000-00000000b001';
update public.profiles set status = 'active' where id in ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000b003');

insert into public.clients (id, name, slug)
values
  ('20000000-0000-0000-0000-00000000c001', 'Commercial Client A', 'commercial-client-a'),
  ('20000000-0000-0000-0000-00000000c002', 'Commercial Client B', 'commercial-client-b');

insert into public.client_users (client_id, user_id)
values
  ('20000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000b002'),
  ('20000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000b003');

insert into public.client_offers (
  id, client_id, source_offer_id, source_offer_version, name, cycle_days,
  daily_budget, ad_budget, service_rate, service_fee, gst_rate, gst,
  creative_unit_price, included_creatives, creative_charge, gross_total,
  total, starts_on, ends_on, created_by
)
values
  ('40000000-0000-0000-0000-00000000d001', '20000000-0000-0000-0000-00000000c001', '31000000-0000-0000-0000-000000000200', 1, 'Client A Local Starter', 31, 200, 6200, 35, 2170, 18, 1116, 2000, 1, 2000, 11486, 11486, '2026-09-01', '2026-10-01', '00000000-0000-0000-0000-00000000b001'),
  ('40000000-0000-0000-0000-00000000d002', '20000000-0000-0000-0000-00000000c002', '31000000-0000-0000-0000-000000000200', 1, 'Client B Local Starter', 31, 200, 6200, 35, 2170, 18, 1116, 2000, 1, 2000, 11486, 11486, '2026-09-01', '2026-10-01', '00000000-0000-0000-0000-00000000b001');

insert into public.payment_entries (id, client_offer_id, client_id, amount, paid_on, method, created_by)
values ('50000000-0000-0000-0000-00000000e001', '40000000-0000-0000-0000-00000000d001', '20000000-0000-0000-0000-00000000c001', 1000, '2026-09-02', 'upi', '00000000-0000-0000-0000-00000000b001');

insert into public.meta_accounts (id, client_id, external_account_id, name)
values
  ('60000000-0000-0000-0000-00000000f001', '20000000-0000-0000-0000-00000000c001', '111111111', 'Client A Ads'),
  ('60000000-0000-0000-0000-00000000f002', '20000000-0000-0000-0000-00000000c002', '222222222', 'Client B Ads');

insert into public.campaigns (id, client_id, meta_account_id, external_id, name)
values
  ('70000000-0000-0000-0000-00000000a001', '20000000-0000-0000-0000-00000000c001', '60000000-0000-0000-0000-00000000f001', 'campaign-a', 'Client A Campaign'),
  ('70000000-0000-0000-0000-00000000a002', '20000000-0000-0000-0000-00000000c002', '60000000-0000-0000-0000-00000000f002', 'campaign-b', 'Client B Campaign');

insert into public.daily_metrics (client_id, meta_account_id, campaign_id, metric_date, spend, reach, impressions, clicks, results)
values
  ('20000000-0000-0000-0000-00000000c001', '60000000-0000-0000-0000-00000000f001', '70000000-0000-0000-0000-00000000a001', '2026-09-03', 200, 1000, 1500, 30, 5),
  ('20000000-0000-0000-0000-00000000c002', '60000000-0000-0000-0000-00000000f002', '70000000-0000-0000-0000-00000000a002', '2026-09-03', 300, 1200, 1900, 40, 8);

insert into public.reporting_snapshots (
  client_id, meta_account_id, scope_type, scope_external_id,
  period_key, period_start, period_end, spend, reach, impressions
)
values
  ('20000000-0000-0000-0000-00000000c001', '60000000-0000-0000-0000-00000000f001', 'account', '111111111', '28d', '2026-08-07', '2026-09-03', 200, 800, 1500),
  ('20000000-0000-0000-0000-00000000c002', '60000000-0000-0000-0000-00000000f002', 'account', '222222222', '28d', '2026-08-07', '2026-09-03', 300, 950, 1900);

insert into public.sync_logs (client_id, meta_account_id, trigger_source, request_id)
values
  ('20000000-0000-0000-0000-00000000c001', '60000000-0000-0000-0000-00000000f001', 'manual', 'phase4-a'),
  ('20000000-0000-0000-0000-00000000c002', '60000000-0000-0000-0000-00000000f002', 'scheduled', 'phase4-b');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000b002';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000b002","role":"authenticated"}';

select is((select count(*) from public.client_offers), 1::bigint, 'Client A sees one assignment');
select is((select count(*) from public.client_offers where client_id = '20000000-0000-0000-0000-00000000c002'), 0::bigint, 'Client A cannot see Client B assignment');
select is((select count(*) from public.payment_entries), 1::bigint, 'Client A sees its payment');
select is((select count(*) from public.meta_accounts), 1::bigint, 'Client A sees its Meta mapping');
select is((select count(*) from public.campaigns), 1::bigint, 'Client A sees its campaign');
select is((select count(*) from public.daily_metrics), 1::bigint, 'Client A sees its metrics');
select is((select count(*) from public.reporting_snapshots), 1::bigint, 'Client A sees its reporting snapshot');
select is((select count(*) from public.reporting_snapshots where client_id = '20000000-0000-0000-0000-00000000c002'), 0::bigint, 'Client A cannot see Client B reporting snapshot');
select is((select count(*) from public.sync_logs), 1::bigint, 'Client A sees its sync status');
with changed as (
  update public.client_offers
  set status = 'cancelled'
  where client_id = '20000000-0000-0000-0000-00000000c001'
  returning 1
)
select is(
  (select count(*) from changed),
  0::bigint,
  'Client A cannot change its assignment'
);
select throws_ok(
  $$insert into public.payment_entries (client_offer_id, client_id, amount) values ('40000000-0000-0000-0000-00000000d001', '20000000-0000-0000-0000-00000000c001', 10)$$,
  '42501',
  'new row violates row-level security policy for table "payment_entries"',
  'Client A cannot record its own payment'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000b001';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000b001","role":"authenticated"}';

select is((select count(*) from public.client_offers), 2::bigint, 'active admin sees every assignment');
select is((select count(*) from public.payment_entries), 1::bigint, 'active admin sees every payment');
select is((select count(*) from public.daily_metrics), 2::bigint, 'active admin sees every client metric');
select is((select count(*) from public.reporting_snapshots), 2::bigint, 'active admin sees every client reporting snapshot');
select throws_ok(
  $$update public.client_offers set daily_budget = 201 where id = '40000000-0000-0000-0000-00000000d001'$$,
  'P0001',
  'Assigned commercial pricing is immutable; create a new client offer instead.',
  'admin cannot rewrite frozen pricing'
);
select throws_ok(
  $$insert into public.payment_entries (client_offer_id, client_id, amount) values ('40000000-0000-0000-0000-00000000d001', '20000000-0000-0000-0000-00000000c001', 11000)$$,
  'P0001',
  'Recorded payments cannot exceed the assigned offer total.',
  'payments cannot exceed the client total'
);
with changed as (
  update public.payment_entries
  set status = 'voided'
  where id = '50000000-0000-0000-0000-00000000e001'
  returning 1
)
select is(
  (select count(*) from changed),
  1::bigint,
  'admin can void a payment without deleting history'
);
select lives_ok(
  $$select public.assign_client_offer(
    '20000000-0000-0000-0000-00000000c001',
    '31000000-0000-0000-0000-000000000400',
    'Client A Local Growth', '', 'standard'::public.offer_kind,
    'monthly'::public.offer_billing_type, 'INR', 31::smallint,
    400::numeric, 12400::numeric, 35::numeric, 4340::numeric,
    18::numeric, 2232::numeric, 2000::numeric, 1::smallint,
    2000::numeric, 0::numeric, 0::numeric, 0::numeric,
    20972::numeric, 20972::numeric, '2026-10-02'::date, ''
  )$$,
  'admin can atomically replace the active assignment'
);
select is((select count(*) from public.client_offers where client_id = '20000000-0000-0000-0000-00000000c001' and status = 'active'), 1::bigint, 'Client A has exactly one active assignment');
select is((select count(*) from public.client_offers where client_id = '20000000-0000-0000-0000-00000000c001' and status = 'completed'), 1::bigint, 'previous assignment remains as completed history');
select is((select offer_id from public.clients where id = '20000000-0000-0000-0000-00000000c001'), '31000000-0000-0000-0000-000000000400'::uuid, 'client convenience pointer follows the new source offer');
select is((select count(*) from public.payment_entries where client_id = '20000000-0000-0000-0000-00000000c001'), 1::bigint, 'voided payment remains in the ledger');
select throws_ok(
  $$delete from public.offers where id = '31000000-0000-0000-0000-000000000200'$$,
  '42501',
  'permission denied for table offers',
  'browser admin cannot hard-delete an offer'
);

reset role;
select * from finish();
rollback;
