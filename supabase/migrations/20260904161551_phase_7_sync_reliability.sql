-- Phase 7: reliable, tenant-isolated Meta synchronization.
-- Synchronization credentials remain server-only. The public schema stores
-- only an opaque lock owner, safe connection diagnostics, and reporting data.

alter table public.meta_accounts
  add column sync_lock_owner text,
  add column credential_warning text,
  add constraint meta_accounts_sync_lock_owner_length check (
    sync_lock_owner is null or char_length(sync_lock_owner) between 1 and 128
  ),
  add constraint meta_accounts_credential_warning_length check (
    credential_warning is null or char_length(credential_warning) <= 500
  );

alter table public.campaigns
  add column is_current boolean not null default true;

alter table public.ad_sets
  add column is_current boolean not null default true;

alter table public.ads
  add column is_current boolean not null default true;

-- Cover synchronization claims, stale-row reconciliation, client reads, and
-- the two foreign keys that previously had no supporting child-side index.
create index meta_accounts_client_lock_idx
  on public.meta_accounts (client_id, sync_locked_until)
  where sync_locked_until is not null;
create index campaigns_account_current_seen_idx
  on public.campaigns (meta_account_id, last_seen_at)
  where is_current;
create index campaigns_client_current_idx
  on public.campaigns (client_id, updated_at desc)
  where is_current;
create index ad_sets_account_current_seen_idx
  on public.ad_sets (meta_account_id, last_seen_at)
  where is_current;
create index ads_account_current_seen_idx
  on public.ads (meta_account_id, last_seen_at)
  where is_current;
create index ads_ad_set_id_idx on public.ads (ad_set_id);
create index sync_logs_requested_by_idx
  on public.sync_logs (requested_by)
  where requested_by is not null;

create or replace function public.claim_meta_sync(
  p_meta_account_id uuid,
  p_sync_log_id uuid,
  p_lock_owner text
)
returns setof public.meta_accounts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed_account public.meta_accounts%rowtype;
  target_client_id uuid;
  claimed_count integer;
  claimed_at timestamptz;
begin
  if p_lock_owner is null or char_length(p_lock_owner) not between 1 and 128 then
    raise exception 'A valid synchronization lock owner is required.';
  end if;

  select account.client_id
  into target_client_id
  from public.meta_accounts as account
  where account.id = p_meta_account_id
    and account.active;

  if target_client_id is null then
    return;
  end if;

  -- Serialize claims for every Meta account belonging to the same client.
  perform pg_advisory_xact_lock(hashtextextended(target_client_id::text, 0));
  claimed_at := clock_timestamp();

  update public.meta_accounts as account
  set sync_locked_until = claimed_at + interval '16 minutes',
      sync_lock_owner = p_lock_owner,
      last_sync_started_at = claimed_at
  where account.id = p_meta_account_id
    and account.client_id = target_client_id
    and account.active
    and exists (
      select 1
      from public.sync_logs as log
      where log.id = p_sync_log_id
        and log.meta_account_id = account.id
        and log.client_id = account.client_id
        and log.status in ('queued', 'failed')
    )
    and not exists (
      select 1
      from public.meta_accounts as held
      where held.client_id = target_client_id
        and held.sync_locked_until > claimed_at
    )
  returning account.* into claimed_account;

  get diagnostics claimed_count = row_count;
  if claimed_count = 0 then
    return;
  end if;

  update public.sync_logs as log
  set status = 'running',
      started_at = claimed_at,
      completed_at = null,
      attempt = least(10, case when log.status = 'failed' then log.attempt + 1 else log.attempt end),
      message = 'Fetching Meta entities and recent daily insights.',
      error_code = null
  where log.id = p_sync_log_id
    and log.meta_account_id = p_meta_account_id
    and log.client_id = target_client_id;

  get diagnostics claimed_count = row_count;
  if claimed_count <> 1 then
    raise exception 'The synchronization log could not be claimed.';
  end if;

  return next claimed_account;
end;
$$;

create or replace function public.complete_meta_sync(
  p_meta_account_id uuid,
  p_sync_log_id uuid,
  p_lock_owner text,
  p_synced_at timestamptz,
  p_name text,
  p_currency_code text,
  p_timezone_name text,
  p_business_name text,
  p_remote_account_status integer,
  p_records_synced integer,
  p_pages_fetched integer,
  p_rate_limit_retries integer,
  p_api_usage jsonb,
  p_message text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_client_id uuid;
  effective_remote_status integer;
  changed_count integer;
begin
  if p_records_synced < 0 or p_pages_fetched < 0 or p_rate_limit_retries < 0 then
    raise exception 'Synchronization diagnostics cannot be negative.';
  end if;

  select coalesce(p_remote_account_status, account.remote_account_status)
  into effective_remote_status
  from public.meta_accounts as account
  where account.id = p_meta_account_id
    and account.sync_lock_owner = p_lock_owner
  for update;

  update public.meta_accounts as account
  set name = p_name,
      currency_code = p_currency_code,
      timezone_name = p_timezone_name,
      business_name = coalesce(p_business_name, account.business_name),
      remote_account_status = effective_remote_status,
      last_verified_at = p_synced_at,
      connection_status = case
        when effective_remote_status is not null and effective_remote_status <> 1 then 'attention'::public.meta_connection_status
        when account.credential_warning is not null
          or account.token_status in ('expiring', 'expired', 'revoked') then 'attention'::public.meta_connection_status
        else 'connected'::public.meta_connection_status
      end,
      last_success_at = p_synced_at,
      last_error_summary = case
        when effective_remote_status is not null and effective_remote_status <> 1
          then format('Meta account status %s requires attention.', effective_remote_status)
        when account.credential_warning is not null then account.credential_warning
        when account.token_status in ('expiring', 'expired', 'revoked')
          then format('Meta token status is %s.', account.token_status)
        else null
      end,
      sync_locked_until = null,
      sync_lock_owner = null
  where account.id = p_meta_account_id
    and account.sync_lock_owner = p_lock_owner
  returning account.client_id into target_client_id;

  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    return false;
  end if;

  update public.sync_logs as log
  set status = 'succeeded',
      completed_at = p_synced_at,
      records_synced = p_records_synced,
      pages_fetched = p_pages_fetched,
      rate_limit_retries = p_rate_limit_retries,
      api_usage = coalesce(p_api_usage, '{}'::jsonb),
      message = p_message,
      error_code = null
  where log.id = p_sync_log_id
    and log.meta_account_id = p_meta_account_id
    and log.client_id = target_client_id;

  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'The successful synchronization log could not be finalized.';
  end if;

  return true;
end;
$$;

create or replace function public.fail_meta_sync(
  p_meta_account_id uuid,
  p_sync_log_id uuid,
  p_lock_owner text,
  p_failed_at timestamptz,
  p_token_status public.meta_token_status,
  p_pages_fetched integer,
  p_rate_limit_retries integer,
  p_api_usage jsonb,
  p_message text,
  p_error_code text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_client_id uuid;
  changed_count integer;
begin
  update public.meta_accounts as account
  set connection_status = 'attention',
      token_status = coalesce(p_token_status, account.token_status),
      last_error_summary = p_message,
      sync_locked_until = null,
      sync_lock_owner = null
  where account.id = p_meta_account_id
    and account.sync_lock_owner = p_lock_owner
  returning account.client_id into target_client_id;

  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    return false;
  end if;

  update public.sync_logs as log
  set status = 'failed',
      completed_at = p_failed_at,
      pages_fetched = p_pages_fetched,
      rate_limit_retries = p_rate_limit_retries,
      api_usage = coalesce(p_api_usage, '{}'::jsonb),
      message = p_message,
      error_code = p_error_code
  where log.id = p_sync_log_id
    and log.meta_account_id = p_meta_account_id
    and log.client_id = target_client_id;

  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'The failed synchronization log could not be finalized.';
  end if;

  return true;
end;
$$;

revoke all on function public.claim_meta_sync(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.complete_meta_sync(uuid, uuid, text, timestamptz, text, text, text, text, integer, integer, integer, integer, jsonb, text) from public, anon, authenticated;
revoke all on function public.fail_meta_sync(uuid, uuid, text, timestamptz, public.meta_token_status, integer, integer, jsonb, text, text) from public, anon, authenticated;

grant execute on function public.claim_meta_sync(uuid, uuid, text) to service_role;
grant execute on function public.complete_meta_sync(uuid, uuid, text, timestamptz, text, text, text, text, integer, integer, integer, integer, jsonb, text) to service_role;
grant execute on function public.fail_meta_sync(uuid, uuid, text, timestamptz, public.meta_token_status, integer, integer, jsonb, text, text) to service_role;

comment on column public.meta_accounts.sync_lock_owner is
  'Opaque Netlify invocation identifier used for ownership-safe lock release.';
comment on column public.meta_accounts.credential_warning is
  'Server-derived token expiry or permission warning preserved across successful data syncs.';
comment on column public.campaigns.is_current is
  'False when a complete later Meta entity response no longer contains this campaign.';
comment on function public.claim_meta_sync(uuid, uuid, text) is
  'Service-only atomic per-client synchronization claim with a bounded lease.';
comment on function public.complete_meta_sync(uuid, uuid, text, timestamptz, text, text, text, text, integer, integer, integer, integer, jsonb, text) is
  'Service-only atomic synchronization success finalizer that releases only the owning lease.';
comment on function public.fail_meta_sync(uuid, uuid, text, timestamptz, public.meta_token_status, integer, integer, jsonb, text, text) is
  'Service-only atomic synchronization failure finalizer that releases only the owning lease.';
