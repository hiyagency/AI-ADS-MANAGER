-- Phase 7: complete child-side foreign-key indexes used by offer history and
-- audit attribution. These keep archive checks and profile deletes predictable
-- as production client volume grows.

create index offers_source_offer_id_idx
  on public.offers (source_offer_id)
  where source_offer_id is not null;

create index client_offers_created_by_idx
  on public.client_offers (created_by)
  where created_by is not null;

create index payment_entries_created_by_idx
  on public.payment_entries (created_by)
  where created_by is not null;
