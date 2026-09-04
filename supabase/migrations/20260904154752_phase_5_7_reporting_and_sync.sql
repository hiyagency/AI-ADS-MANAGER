-- Phases 5-7: tenant-scoped Meta reporting and observable synchronization.
-- Access tokens remain server-only and are never stored in the exposed schema.

create type public.meta_connection_status as enum ('pending', 'connected', 'attention', 'disconnected');
create type public.meta_token_status as enum ('unknown', 'healthy', 'expiring', 'expired', 'revoked');
create type public.sync_status as enum ('queued', 'running', 'succeeded', 'partial', 'failed');
create type public.sync_trigger as enum ('scheduled', 'manual');

create table public.meta_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  external_account_id text not null unique,
  name text not null,
  currency_code text not null default 'INR',
  timezone_name text not null default 'Asia/Kolkata',
  connection_status public.meta_connection_status not null default 'pending',
  token_status public.meta_token_status not null default 'unknown',
  token_expires_at timestamptz,
  last_sync_started_at timestamptz,
  last_success_at timestamptz,
  sync_locked_until timestamptz,
  last_error_summary text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meta_accounts_external_id_format check (external_account_id ~ '^[0-9]+$'),
  constraint meta_accounts_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint meta_accounts_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint meta_accounts_timezone_length check (char_length(timezone_name) between 1 and 80),
  constraint meta_accounts_error_length check (
    last_error_summary is null or char_length(last_error_summary) <= 500
  ),
  constraint meta_accounts_id_client_unique unique (id, client_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  meta_account_id uuid not null,
  external_id text not null,
  name text not null,
  objective text,
  configured_status text not null default 'UNKNOWN',
  effective_status text not null default 'UNKNOWN',
  starts_at timestamptz,
  ends_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_account_client_fkey
    foreign key (meta_account_id, client_id)
    references public.meta_accounts (id, client_id)
    on delete cascade,
  constraint campaigns_external_id_length check (char_length(external_id) between 1 and 120),
  constraint campaigns_name_length check (char_length(btrim(name)) between 1 and 300),
  constraint campaigns_id_client_unique unique (id, client_id),
  constraint campaigns_account_external_unique unique (meta_account_id, external_id)
);

create table public.ad_sets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  campaign_id uuid not null,
  meta_account_id uuid not null,
  external_id text not null,
  name text not null,
  configured_status text not null default 'UNKNOWN',
  effective_status text not null default 'UNKNOWN',
  daily_budget numeric(12, 2),
  lifetime_budget numeric(12, 2),
  optimization_goal text,
  billing_event text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_sets_campaign_client_fkey
    foreign key (campaign_id, client_id)
    references public.campaigns (id, client_id)
    on delete cascade,
  constraint ad_sets_account_client_fkey
    foreign key (meta_account_id, client_id)
    references public.meta_accounts (id, client_id)
    on delete cascade,
  constraint ad_sets_budgets_non_negative check (
    (daily_budget is null or daily_budget >= 0)
    and (lifetime_budget is null or lifetime_budget >= 0)
  ),
  constraint ad_sets_id_client_unique unique (id, client_id),
  constraint ad_sets_account_external_unique unique (meta_account_id, external_id)
);

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  ad_set_id uuid not null,
  campaign_id uuid not null,
  meta_account_id uuid not null,
  external_id text not null,
  name text not null,
  configured_status text not null default 'UNKNOWN',
  effective_status text not null default 'UNKNOWN',
  creative_external_id text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ads_ad_set_client_fkey
    foreign key (ad_set_id, client_id)
    references public.ad_sets (id, client_id)
    on delete cascade,
  constraint ads_campaign_client_fkey
    foreign key (campaign_id, client_id)
    references public.campaigns (id, client_id)
    on delete cascade,
  constraint ads_account_client_fkey
    foreign key (meta_account_id, client_id)
    references public.meta_accounts (id, client_id)
    on delete cascade,
  constraint ads_id_client_unique unique (id, client_id),
  constraint ads_account_external_unique unique (meta_account_id, external_id)
);

create table public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  meta_account_id uuid not null,
  campaign_id uuid not null,
  metric_date date not null,
  attribution_window text not null default 'account_default',
  spend numeric(14, 2) not null default 0,
  reach bigint not null default 0,
  impressions bigint not null default 0,
  frequency numeric(12, 4) not null default 0,
  clicks bigint not null default 0,
  link_clicks bigint not null default 0,
  ctr numeric(12, 6) not null default 0,
  cpc numeric(14, 4) not null default 0,
  cpm numeric(14, 4) not null default 0,
  results numeric(14, 2) not null default 0,
  result_type text,
  cost_per_result numeric(14, 4) not null default 0,
  leads numeric(14, 2) not null default 0,
  messaging_conversations numeric(14, 2) not null default 0,
  video_plays bigint not null default 0,
  video_thruplays bigint not null default 0,
  result_breakdown jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  constraint daily_metrics_account_client_fkey
    foreign key (meta_account_id, client_id)
    references public.meta_accounts (id, client_id)
    on delete cascade,
  constraint daily_metrics_campaign_client_fkey
    foreign key (campaign_id, client_id)
    references public.campaigns (id, client_id)
    on delete cascade,
  constraint daily_metrics_non_negative check (
    spend >= 0
    and reach >= 0
    and impressions >= 0
    and frequency >= 0
    and clicks >= 0
    and link_clicks >= 0
    and ctr >= 0
    and cpc >= 0
    and cpm >= 0
    and results >= 0
    and cost_per_result >= 0
    and leads >= 0
    and messaging_conversations >= 0
    and video_plays >= 0
    and video_thruplays >= 0
  ),
  constraint daily_metrics_result_breakdown_object check (jsonb_typeof(result_breakdown) = 'object'),
  constraint daily_metrics_unique unique (
    campaign_id,
    metric_date,
    attribution_window
  )
);

create table public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  meta_account_id uuid not null,
  status public.sync_status not null default 'queued',
  trigger_source public.sync_trigger not null,
  requested_by uuid references public.profiles (id) on delete set null,
  request_id text not null,
  started_at timestamptz,
  completed_at timestamptz,
  records_synced integer not null default 0,
  attempt smallint not null default 1,
  message text,
  error_code text,
  cursor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_logs_account_client_fkey
    foreign key (meta_account_id, client_id)
    references public.meta_accounts (id, client_id)
    on delete cascade,
  constraint sync_logs_request_id_unique unique (request_id),
  constraint sync_logs_counts check (records_synced >= 0 and attempt between 1 and 10),
  constraint sync_logs_message_length check (message is null or char_length(message) <= 1000),
  constraint sync_logs_error_code_length check (error_code is null or char_length(error_code) <= 120)
);

create index meta_accounts_client_active_idx on public.meta_accounts (client_id) where active;
create index campaigns_client_status_idx on public.campaigns (client_id, effective_status);
create index ad_sets_campaign_idx on public.ad_sets (campaign_id);
create index ads_campaign_idx on public.ads (campaign_id);
create index daily_metrics_client_date_idx on public.daily_metrics (client_id, metric_date desc);
create index daily_metrics_campaign_date_idx on public.daily_metrics (campaign_id, metric_date desc);
create index sync_logs_account_created_idx on public.sync_logs (meta_account_id, created_at desc);
create index sync_logs_failed_idx on public.sync_logs (created_at desc) where status in ('partial', 'failed');

create trigger meta_accounts_set_updated_at before update on public.meta_accounts
for each row execute function private.set_updated_at();
create trigger campaigns_set_updated_at before update on public.campaigns
for each row execute function private.set_updated_at();
create trigger ad_sets_set_updated_at before update on public.ad_sets
for each row execute function private.set_updated_at();
create trigger ads_set_updated_at before update on public.ads
for each row execute function private.set_updated_at();
create trigger sync_logs_set_updated_at before update on public.sync_logs
for each row execute function private.set_updated_at();

comment on table public.meta_accounts is
  'Tenant mapping and safe connection health only. Meta access tokens remain in server-only environment configuration.';
comment on table public.daily_metrics is
  'Campaign-level daily facts refreshed incrementally; recent dates may be overwritten as attribution matures.';

alter table public.meta_accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.ad_sets enable row level security;
alter table public.ads enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.sync_logs enable row level security;

revoke all on table public.meta_accounts from anon, authenticated;
revoke all on table public.campaigns from anon, authenticated;
revoke all on table public.ad_sets from anon, authenticated;
revoke all on table public.ads from anon, authenticated;
revoke all on table public.daily_metrics from anon, authenticated;
revoke all on table public.sync_logs from anon, authenticated;

grant select on table public.meta_accounts to authenticated;
grant select on table public.campaigns to authenticated;
grant select on table public.ad_sets to authenticated;
grant select on table public.ads to authenticated;
grant select on table public.daily_metrics to authenticated;
grant select on table public.sync_logs to authenticated;
grant select, insert, update, delete on table public.meta_accounts to service_role;
grant select, insert, update, delete on table public.campaigns to service_role;
grant select, insert, update, delete on table public.ad_sets to service_role;
grant select, insert, update, delete on table public.ads to service_role;
grant select, insert, update, delete on table public.daily_metrics to service_role;
grant select, insert, update, delete on table public.sync_logs to service_role;
grant usage on type public.meta_connection_status to authenticated, service_role;
grant usage on type public.meta_token_status to authenticated, service_role;
grant usage on type public.sync_status to authenticated, service_role;
grant usage on type public.sync_trigger to authenticated, service_role;

create policy "Clients can view their Meta account and admins can view all"
on public.meta_accounts for select to authenticated
using ((select private.can_access_client(client_id)));

create policy "Clients can view their campaigns and admins can view all"
on public.campaigns for select to authenticated
using ((select private.can_access_client(client_id)));

create policy "Clients can view their ad sets and admins can view all"
on public.ad_sets for select to authenticated
using ((select private.can_access_client(client_id)));

create policy "Clients can view their ads and admins can view all"
on public.ads for select to authenticated
using ((select private.can_access_client(client_id)));

create policy "Clients can view their metrics and admins can view all"
on public.daily_metrics for select to authenticated
using ((select private.can_access_client(client_id)));

create policy "Clients can view their sync status and admins can view all"
on public.sync_logs for select to authenticated
using ((select private.can_access_client(client_id)));
