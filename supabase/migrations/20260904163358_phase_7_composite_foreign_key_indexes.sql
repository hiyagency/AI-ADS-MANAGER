-- Phase 7: cover every composite tenant foreign key on its child table.
-- PostgreSQL does not create these indexes automatically; they keep cascades,
-- tenant joins, and integrity checks predictable as reporting volume grows.

create index ad_sets_account_client_fk_idx
  on public.ad_sets (meta_account_id, client_id);

create index ad_sets_campaign_client_fk_idx
  on public.ad_sets (campaign_id, client_id);

create index ads_account_client_fk_idx
  on public.ads (meta_account_id, client_id);

create index ads_ad_set_client_fk_idx
  on public.ads (ad_set_id, client_id);

create index ads_campaign_client_fk_idx
  on public.ads (campaign_id, client_id);

create index campaigns_account_client_fk_idx
  on public.campaigns (meta_account_id, client_id);

create index daily_metrics_account_client_fk_idx
  on public.daily_metrics (meta_account_id, client_id);

create index daily_metrics_campaign_client_fk_idx
  on public.daily_metrics (campaign_id, client_id);

create index payment_entries_offer_client_fk_idx
  on public.payment_entries (client_offer_id, client_id);

create index reporting_snapshots_account_client_fk_idx
  on public.reporting_snapshots (meta_account_id, client_id);

create index reporting_snapshots_campaign_client_fk_idx
  on public.reporting_snapshots (campaign_id, client_id)
  where campaign_id is not null;

create index sync_logs_account_client_fk_idx
  on public.sync_logs (meta_account_id, client_id);
