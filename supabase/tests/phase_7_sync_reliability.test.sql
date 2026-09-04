begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(26);

select has_column('public', 'meta_accounts', 'sync_lock_owner', 'Meta synchronization leases have an owner');
select has_column('public', 'meta_accounts', 'credential_warning', 'credential warnings survive successful reporting syncs');
select has_column('public', 'campaigns', 'is_current', 'campaign freshness is explicit');
select has_column('public', 'ad_sets', 'is_current', 'ad set freshness is explicit');
select has_column('public', 'ads', 'is_current', 'ad freshness is explicit');

select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'meta_accounts_client_lock_idx'), 'per-client lease checks are indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'campaigns_account_current_seen_idx'), 'campaign reconciliation is indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'ad_sets_account_current_seen_idx'), 'ad set reconciliation is indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'ads_account_current_seen_idx'), 'ad reconciliation is indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'ads_ad_set_id_idx'), 'the ads ad-set foreign key is indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'sync_logs_requested_by_idx'), 'the sync-log requester foreign key is indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'offers_source_offer_id_idx'), 'duplicated offer ancestry is indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'client_offers_created_by_idx'), 'assignment creator lookups are indexed');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'payment_entries_created_by_idx'), 'payment creator lookups are indexed');

select has_function('public', 'claim_meta_sync', array['uuid', 'uuid', 'text'], 'the atomic claim function exists');
select has_function('public', 'complete_meta_sync', array['uuid', 'uuid', 'text', 'timestamp with time zone', 'text', 'text', 'text', 'text', 'integer', 'integer', 'integer', 'integer', 'jsonb', 'text'], 'the atomic success finalizer exists');
select has_function('public', 'fail_meta_sync', array['uuid', 'uuid', 'text', 'timestamp with time zone', 'meta_token_status', 'integer', 'integer', 'jsonb', 'text', 'text'], 'the atomic failure finalizer exists');

select ok(not has_function_privilege('anon', 'public.claim_meta_sync(uuid,uuid,text)', 'execute'), 'anonymous sessions cannot claim synchronization work');
select ok(not has_function_privilege('authenticated', 'public.claim_meta_sync(uuid,uuid,text)', 'execute'), 'browser sessions cannot claim synchronization work');
select ok(has_function_privilege('service_role', 'public.claim_meta_sync(uuid,uuid,text)', 'execute'), 'the server role can claim synchronization work');
select ok(not has_function_privilege('authenticated', 'public.complete_meta_sync(uuid,uuid,text,timestamptz,text,text,text,text,integer,integer,integer,integer,jsonb,text)', 'execute'), 'browser sessions cannot finalize successful synchronization');
select ok(has_function_privilege('service_role', 'public.complete_meta_sync(uuid,uuid,text,timestamptz,text,text,text,text,integer,integer,integer,integer,jsonb,text)', 'execute'), 'the server role can finalize successful synchronization');
select ok(not has_function_privilege('authenticated', 'public.fail_meta_sync(uuid,uuid,text,timestamptz,public.meta_token_status,integer,integer,jsonb,text,text)', 'execute'), 'browser sessions cannot finalize failed synchronization');
select ok(has_function_privilege('service_role', 'public.fail_meta_sync(uuid,uuid,text,timestamptz,public.meta_token_status,integer,integer,jsonb,text,text)', 'execute'), 'the server role can finalize failed synchronization');

select is((select prosecdef from pg_catalog.pg_proc where oid = 'public.claim_meta_sync(uuid,uuid,text)'::regprocedure), false, 'the claim function is security invoker');
select is((select prosecdef from pg_catalog.pg_proc where oid = 'public.complete_meta_sync(uuid,uuid,text,timestamptz,text,text,text,text,integer,integer,integer,integer,jsonb,text)'::regprocedure), false, 'the success finalizer is security invoker');

select * from finish();
rollback;
