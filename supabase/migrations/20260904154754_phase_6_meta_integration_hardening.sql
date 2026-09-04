-- Phase 6: harden the local Meta Marketing API connection model.
-- Credentials remain exclusively in server environment variables. This
-- migration stores only safe account metadata, health, and sync diagnostics.

alter table public.meta_accounts
  add column business_name text,
  add column remote_account_status integer,
  add column last_verified_at timestamptz,
  add constraint meta_accounts_business_name_length check (
    business_name is null or char_length(btrim(business_name)) between 1 and 200
  ),
  add constraint meta_accounts_remote_status_non_negative check (
    remote_account_status is null or remote_account_status >= 0
  );

alter table public.campaigns
  add column last_seen_at timestamptz not null default now();

alter table public.ad_sets
  add column last_seen_at timestamptz not null default now();

alter table public.ads
  add column last_seen_at timestamptz not null default now();

alter table public.daily_metrics
  add column available_metrics text[] not null default '{}'::text[],
  add constraint daily_metrics_available_metrics_valid check (
    available_metrics <@ array[
      'spend',
      'reach',
      'impressions',
      'frequency',
      'clicks',
      'link_clicks',
      'ctr',
      'cpc',
      'cpm',
      'results',
      'cost_per_result',
      'leads',
      'messaging_conversations',
      'video_plays',
      'video_thruplays'
    ]::text[]
  );

alter table public.sync_logs
  add column pages_fetched integer not null default 0,
  add column rate_limit_retries integer not null default 0,
  add column api_usage jsonb not null default '{}'::jsonb,
  add constraint sync_logs_diagnostics_non_negative check (
    pages_fetched >= 0 and rate_limit_retries >= 0
  ),
  add constraint sync_logs_api_usage_object check (jsonb_typeof(api_usage) = 'object');

-- Full indexes are required for RLS lookups and parent deletes. Earlier partial
-- or composite indexes do not cover inactive rows or client-first filtering.
create index meta_accounts_client_id_idx on public.meta_accounts (client_id);
create index ad_sets_client_id_idx on public.ad_sets (client_id);
create index ads_client_id_idx on public.ads (client_id);
create index daily_metrics_meta_account_date_idx
  on public.daily_metrics (meta_account_id, metric_date desc);
create index sync_logs_client_created_at_idx
  on public.sync_logs (client_id, created_at desc);

comment on column public.meta_accounts.last_verified_at is
  'Last successful server-side Graph API account verification.';
comment on column public.meta_accounts.remote_account_status is
  'Meta account_status value retained as diagnostic metadata.';
comment on column public.daily_metrics.available_metrics is
  'Stable internal metric names actually returned by Meta for this row.';
comment on column public.sync_logs.api_usage is
  'Sanitized Meta usage headers. Never contains credentials or request URLs.';
