begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

select has_column('public', 'meta_accounts', 'business_name', 'Meta mappings store safe business metadata');
select has_column('public', 'meta_accounts', 'remote_account_status', 'Meta mappings store the remote account status');
select has_column('public', 'meta_accounts', 'last_verified_at', 'Meta mappings store their last verification time');
select has_column('public', 'campaigns', 'last_seen_at', 'campaign freshness is retained');
select has_column('public', 'ad_sets', 'last_seen_at', 'ad set freshness is retained');
select has_column('public', 'ads', 'last_seen_at', 'ad freshness is retained');
select has_column('public', 'daily_metrics', 'available_metrics', 'metric availability is explicit');
select has_column('public', 'sync_logs', 'pages_fetched', 'sync logs count fetched pages');
select has_column('public', 'sync_logs', 'rate_limit_retries', 'sync logs count rate-limit retries');
select has_column('public', 'sync_logs', 'api_usage', 'sync logs store sanitized usage diagnostics');

select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'meta_accounts_client_id_idx'), 'meta account tenant lookups are indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'ad_sets_client_id_idx'), 'ad set tenant lookups are indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'ads_client_id_idx'), 'ad tenant lookups are indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'daily_metrics_meta_account_date_idx'), 'account metric refreshes are indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'sync_logs_client_created_at_idx'), 'client sync history is indexed');

select is(
  (select count(*) from information_schema.columns where table_schema = 'public' and column_name ~ '(access_token|app_secret|client_secret|credential_value|secret_key|service_role)'),
  0::bigint,
  'the exposed schema stores no Meta credential'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.daily_metrics'::regclass),
  'Phase 6 leaves daily metrics protected by RLS'
);

select * from finish();
rollback;
