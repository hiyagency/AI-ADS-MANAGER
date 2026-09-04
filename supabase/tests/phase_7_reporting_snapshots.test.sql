begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

select has_table('public', 'reporting_snapshots', 'reporting snapshots table exists');
select has_column('public', 'reporting_snapshots', 'scope_type', 'snapshot scope is explicit');
select has_column('public', 'reporting_snapshots', 'period_key', 'dashboard period is explicit');
select has_column('public', 'reporting_snapshots', 'period_start', 'actual coverage start is retained');
select has_column('public', 'reporting_snapshots', 'period_end', 'actual coverage end is retained');
select has_column('public', 'reporting_snapshots', 'available_metrics', 'snapshot availability is explicit');

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.reporting_snapshots'::regclass),
  'reporting snapshots have RLS enabled'
);
select ok(not has_table_privilege('anon', 'public.reporting_snapshots', 'select'), 'anon cannot read snapshots');
select ok(has_table_privilege('authenticated', 'public.reporting_snapshots', 'select'), 'authenticated users can read through RLS');
select ok(not has_table_privilege('authenticated', 'public.reporting_snapshots', 'insert'), 'browser sessions cannot write snapshots');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'reporting_snapshots_client_period_idx'), 'tenant period reads are indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'reporting_snapshots_campaign_period_idx'), 'campaign period reads are indexed');

select * from finish();
rollback;
