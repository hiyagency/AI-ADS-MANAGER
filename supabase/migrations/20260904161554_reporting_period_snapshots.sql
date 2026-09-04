-- Phase 7: exact Meta reporting-window snapshots.
--
-- Daily campaign facts remain useful for trend charts and attribution refreshes,
-- but reach is a unique-person metric and cannot be summed across days or
-- campaigns. These snapshots retain Meta's own aggregate response for every
-- dashboard window so reach, frequency, ratios, and lifetime totals stay honest.

create type public.reporting_scope as enum ('account', 'campaign');
create type public.reporting_period_key as enum ('7d', '14d', '28d', 'month', 'lifetime');

create table public.reporting_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  meta_account_id uuid not null,
  campaign_id uuid,
  scope_type public.reporting_scope not null,
  scope_external_id text not null,
  period_key public.reporting_period_key not null,
  period_start date not null,
  period_end date not null,
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
  available_metrics text[] not null default '{}'::text[],
  result_breakdown jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  constraint reporting_snapshots_account_client_fkey
    foreign key (meta_account_id, client_id)
    references public.meta_accounts (id, client_id)
    on delete cascade,
  constraint reporting_snapshots_campaign_client_fkey
    foreign key (campaign_id, client_id)
    references public.campaigns (id, client_id)
    on delete cascade,
  constraint reporting_snapshots_scope_shape check (
    (scope_type = 'account' and campaign_id is null)
    or (scope_type = 'campaign' and campaign_id is not null)
  ),
  constraint reporting_snapshots_period_valid check (period_start <= period_end),
  constraint reporting_snapshots_scope_external_id_length check (
    char_length(scope_external_id) between 1 and 120
  ),
  constraint reporting_snapshots_non_negative check (
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
  constraint reporting_snapshots_available_metrics_valid check (
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
  ),
  constraint reporting_snapshots_result_breakdown_object check (
    jsonb_typeof(result_breakdown) = 'object'
  ),
  constraint reporting_snapshots_unique unique (
    meta_account_id,
    scope_type,
    scope_external_id,
    period_key,
    attribution_window
  )
);

create index reporting_snapshots_client_period_idx
  on public.reporting_snapshots (client_id, period_key, period_end desc);
create index reporting_snapshots_campaign_period_idx
  on public.reporting_snapshots (campaign_id, period_key)
  where campaign_id is not null;

comment on table public.reporting_snapshots is
  'Meta-provided aggregate values for current dashboard windows. Use these instead of summing daily reach or frequency.';
comment on column public.reporting_snapshots.period_start is
  'Actual first date covered by Meta. For lifetime this is the first date Meta returned, not the local sync start.';
comment on column public.reporting_snapshots.scope_external_id is
  'Stable Meta account or campaign id used in the conflict key for idempotent replacement.';

alter table public.reporting_snapshots enable row level security;

revoke all on table public.reporting_snapshots from anon, authenticated;
grant select on table public.reporting_snapshots to authenticated;
grant select, insert, update, delete on table public.reporting_snapshots to service_role;
grant usage on type public.reporting_scope to authenticated, service_role;
grant usage on type public.reporting_period_key to authenticated, service_role;

create policy "Clients can view their reporting snapshots and admins can view all"
on public.reporting_snapshots for select to authenticated
using ((select private.can_access_client(client_id)));
