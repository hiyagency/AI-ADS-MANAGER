export type AppRole = 'admin' | 'client'
export type EntityStatus = 'active' | 'disabled'
export type OfferBillingType = 'monthly' | 'one_time'
export type OfferCategory = 'local_growth' | 'scale' | 'market_leadership'
export type OfferKind = 'standard' | 'custom'
export type ClientOfferStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type PaymentEntryStatus = 'recorded' | 'voided'
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'card' | 'other'
export type MetaConnectionStatus = 'pending' | 'connected' | 'attention' | 'disconnected'
export type MetaTokenStatus = 'unknown' | 'healthy' | 'expiring' | 'expired' | 'revoked'
export type SyncStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed'
export type SyncTrigger = 'scheduled' | 'manual'
export type ReportingScope = 'account' | 'campaign'
export type ReportingPeriodKey = '7d' | '14d' | '28d' | 'month' | 'lifetime'
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type TableDefinition<Row, Insert, Relationships extends readonly unknown[] = []> = {
  Row: Row
  Insert: Insert
  Update: Partial<Insert>
  Relationships: Relationships
}

type Timestamped = { created_at: string; updated_at: string }

export type Profile = Timestamped & {
  id: string
  email: string | null
  display_name: string | null
  role: AppRole
  status: EntityStatus
}

export type ClientSummary = Timestamped & {
  id: string
  name: string
  slug: string
  status: EntityStatus
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  offer_id: string | null
}

export type ClientMembership = {
  client_id: string
  user_id: string
  created_at: string
}

export type OfferCatalog = Timestamped & {
  id: string
  name: string
  subtitle: string
  summary: string
  currency_code: string
  cycle_days: number
  service_rate: number
  gst_rate: number
  basic_creative_price: number
  ai_manager_month_one_fee: number
  ai_manager_recurring_fee: number
  recommended_testing_min_daily: number
  recommended_testing_max_daily: number
  recommendation: string
  scaling_note: string
  market_leadership_note: string
  month_one_note: string
  month_two_note: string
  client_features: Json
  operating_standards: Json
  commercial_terms: Json
  active: boolean
}

export type Offer = Timestamped & {
  id: string
  catalog_id: string
  slug: string
  name: string
  description: string
  category: OfferCategory
  offer_kind: OfferKind
  billing_type: OfferBillingType
  currency_code: string
  cycle_days: number
  daily_budget: number
  ad_budget: number
  service_rate: number
  service_fee: number
  gst_rate: number
  gst: number
  creative_unit_price: number
  included_creatives: number
  creative_charge: number
  additional_charges: number
  ai_manager_month_one_fee: number
  ai_manager_recurring_fee: number
  month_one_total: number
  month_two_base: number
  recommended_creatives: number
  recommended_month_one_total: number
  active: boolean
  is_public: boolean
  sort_order: number
  source_offer_id: string | null
  version: number
  archived_at: string | null
}

export type ClientOffer = Timestamped & {
  id: string
  client_id: string
  source_offer_id: string | null
  source_offer_version: number | null
  name: string
  description: string
  offer_kind: OfferKind
  billing_type: OfferBillingType
  currency_code: string
  cycle_days: number
  daily_budget: number
  ad_budget: number
  service_rate: number
  service_fee: number
  gst_rate: number
  gst: number
  creative_unit_price: number
  included_creatives: number
  creative_charge: number
  ai_manager_fee: number
  additional_charges: number
  discount: number
  gross_total: number
  total: number
  status: ClientOfferStatus
  starts_on: string
  ends_on: string
  notes: string
  created_by: string | null
}

export type PaymentEntry = Timestamped & {
  id: string
  client_offer_id: string
  client_id: string
  amount: number
  paid_on: string
  method: PaymentMethod
  reference: string | null
  notes: string
  status: PaymentEntryStatus
  created_by: string | null
}

export type MetaAccount = Timestamped & {
  id: string
  client_id: string
  external_account_id: string
  name: string
  currency_code: string
  timezone_name: string
  connection_status: MetaConnectionStatus
  token_status: MetaTokenStatus
  token_expires_at: string | null
  last_sync_started_at: string | null
  last_success_at: string | null
  sync_locked_until: string | null
  sync_lock_owner: string | null
  last_error_summary: string | null
  credential_warning: string | null
  business_name: string | null
  remote_account_status: number | null
  last_verified_at: string | null
  active: boolean
}

export type Campaign = Timestamped & {
  id: string
  client_id: string
  meta_account_id: string
  external_id: string
  name: string
  objective: string | null
  configured_status: string
  effective_status: string
  starts_at: string | null
  ends_at: string | null
  synced_at: string
  last_seen_at: string
  is_current: boolean
}

export type AdSet = Timestamped & {
  id: string
  client_id: string
  campaign_id: string
  meta_account_id: string
  external_id: string
  name: string
  configured_status: string
  effective_status: string
  daily_budget: number | null
  lifetime_budget: number | null
  optimization_goal: string | null
  billing_event: string | null
  synced_at: string
  last_seen_at: string
  is_current: boolean
}

export type Ad = Timestamped & {
  id: string
  client_id: string
  ad_set_id: string
  campaign_id: string
  meta_account_id: string
  external_id: string
  name: string
  configured_status: string
  effective_status: string
  creative_external_id: string | null
  synced_at: string
  last_seen_at: string
  is_current: boolean
}

export type DailyMetric = {
  id: string
  client_id: string
  meta_account_id: string
  campaign_id: string
  metric_date: string
  attribution_window: string
  spend: number
  reach: number
  impressions: number
  frequency: number
  clicks: number
  link_clicks: number
  ctr: number
  cpc: number
  cpm: number
  results: number
  result_type: string | null
  cost_per_result: number
  leads: number
  messaging_conversations: number
  video_plays: number
  video_thruplays: number
  available_metrics: string[]
  result_breakdown: Json
  synced_at: string
}

export type ReportingSnapshot = {
  id: string
  client_id: string
  meta_account_id: string
  campaign_id: string | null
  scope_type: ReportingScope
  scope_external_id: string
  period_key: ReportingPeriodKey
  period_start: string
  period_end: string
  attribution_window: string
  spend: number
  reach: number
  impressions: number
  frequency: number
  clicks: number
  link_clicks: number
  ctr: number
  cpc: number
  cpm: number
  results: number
  result_type: string | null
  cost_per_result: number
  leads: number
  messaging_conversations: number
  video_plays: number
  video_thruplays: number
  available_metrics: string[]
  result_breakdown: Json
  synced_at: string
}

export type SyncLog = Timestamped & {
  id: string
  client_id: string
  meta_account_id: string
  status: SyncStatus
  trigger_source: SyncTrigger
  requested_by: string | null
  request_id: string
  started_at: string | null
  completed_at: string | null
  records_synced: number
  attempt: number
  message: string | null
  error_code: string | null
  cursor: string | null
  pages_fetched: number
  rate_limit_retries: number
  api_usage: Json
}

type BaseInsert<T extends { id: string; created_at?: string; updated_at?: string }> =
  Omit<T, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }

type OfferInsert = Omit<BaseInsert<Offer>, 'description' | 'offer_kind' | 'source_offer_id' | 'version' | 'archived_at'> & {
  description?: string
  offer_kind?: OfferKind
  source_offer_id?: string | null
  version?: number
  archived_at?: string | null
}

type ClientOfferInsert = Omit<BaseInsert<ClientOffer>, 'source_offer_id' | 'source_offer_version' | 'description' | 'offer_kind' | 'billing_type' | 'currency_code' | 'ai_manager_fee' | 'additional_charges' | 'discount' | 'status' | 'notes' | 'created_by'> & {
  source_offer_id?: string | null
  source_offer_version?: number | null
  description?: string
  offer_kind?: OfferKind
  billing_type?: OfferBillingType
  currency_code?: string
  ai_manager_fee?: number
  additional_charges?: number
  discount?: number
  status?: ClientOfferStatus
  notes?: string
  created_by?: string | null
}

type PaymentInsert = Omit<BaseInsert<PaymentEntry>, 'paid_on' | 'method' | 'reference' | 'notes' | 'status' | 'created_by'> & {
  paid_on?: string
  method?: PaymentMethod
  reference?: string | null
  notes?: string
  status?: PaymentEntryStatus
  created_by?: string | null
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<Profile, Omit<Partial<Profile>, 'id'> & { id: string }>
      clients: TableDefinition<ClientSummary, Omit<Partial<ClientSummary>, 'name' | 'slug'> & { name: string; slug: string }>
      client_users: TableDefinition<ClientMembership, { client_id: string; user_id: string; created_at?: string }>
      offer_catalogs: TableDefinition<OfferCatalog, Omit<BaseInsert<OfferCatalog>, 'currency_code' | 'ai_manager_month_one_fee' | 'client_features' | 'operating_standards' | 'commercial_terms' | 'active'> & {
        currency_code?: string
        ai_manager_month_one_fee?: number
        client_features?: Json
        operating_standards?: Json
        commercial_terms?: Json
        active?: boolean
      }>
      offers: TableDefinition<Offer, OfferInsert>
      client_offers: TableDefinition<ClientOffer, ClientOfferInsert>
      payment_entries: TableDefinition<PaymentEntry, PaymentInsert>
      meta_accounts: TableDefinition<MetaAccount, Omit<BaseInsert<MetaAccount>, 'currency_code' | 'timezone_name' | 'connection_status' | 'token_status' | 'token_expires_at' | 'last_sync_started_at' | 'last_success_at' | 'sync_locked_until' | 'sync_lock_owner' | 'last_error_summary' | 'credential_warning' | 'business_name' | 'remote_account_status' | 'last_verified_at' | 'active'> & {
        currency_code?: string
        timezone_name?: string
        connection_status?: MetaConnectionStatus
        token_status?: MetaTokenStatus
        token_expires_at?: string | null
        last_sync_started_at?: string | null
        last_success_at?: string | null
        sync_locked_until?: string | null
        sync_lock_owner?: string | null
        last_error_summary?: string | null
        credential_warning?: string | null
        business_name?: string | null
        remote_account_status?: number | null
        last_verified_at?: string | null
        active?: boolean
      }>
      campaigns: TableDefinition<Campaign, Omit<BaseInsert<Campaign>, 'last_seen_at' | 'is_current'> & { last_seen_at?: string; is_current?: boolean }>
      ad_sets: TableDefinition<AdSet, Omit<BaseInsert<AdSet>, 'last_seen_at' | 'is_current'> & { last_seen_at?: string; is_current?: boolean }>
      ads: TableDefinition<Ad, Omit<BaseInsert<Ad>, 'last_seen_at' | 'is_current'> & { last_seen_at?: string; is_current?: boolean }>
      daily_metrics: TableDefinition<DailyMetric, Omit<DailyMetric, 'id' | 'synced_at' | 'available_metrics'> & { id?: string; synced_at?: string; available_metrics?: string[] }>
      reporting_snapshots: TableDefinition<ReportingSnapshot, Omit<ReportingSnapshot, 'id' | 'synced_at' | 'available_metrics'> & { id?: string; synced_at?: string; available_metrics?: string[] }>
      sync_logs: TableDefinition<SyncLog, Omit<BaseInsert<SyncLog>, 'pages_fetched' | 'rate_limit_retries' | 'api_usage'> & { pages_fetched?: number; rate_limit_retries?: number; api_usage?: Json }>
    }
    Views: Record<string, never>
    Functions: {
      assign_client_offer: {
        Args: {
          p_client_id: string
          p_source_offer_id: string | null
          p_name: string
          p_description: string
          p_offer_kind: OfferKind
          p_billing_type: OfferBillingType
          p_currency_code: string
          p_cycle_days: number
          p_daily_budget: number
          p_ad_budget: number
          p_service_rate: number
          p_service_fee: number
          p_gst_rate: number
          p_gst: number
          p_creative_unit_price: number
          p_included_creatives: number
          p_creative_charge: number
          p_ai_manager_fee: number
          p_additional_charges: number
          p_discount: number
          p_gross_total: number
          p_total: number
          p_starts_on: string
          p_notes: string
        }
        Returns: ClientOffer
      }
      claim_meta_sync: {
        Args: {
          p_meta_account_id: string
          p_sync_log_id: string
          p_lock_owner: string
        }
        Returns: MetaAccount[]
      }
      complete_meta_sync: {
        Args: {
          p_meta_account_id: string
          p_sync_log_id: string
          p_lock_owner: string
          p_synced_at: string
          p_name: string
          p_currency_code: string
          p_timezone_name: string
          p_business_name: string | null
          p_remote_account_status: number | null
          p_records_synced: number
          p_pages_fetched: number
          p_rate_limit_retries: number
          p_api_usage: Json
          p_message: string
        }
        Returns: boolean
      }
      fail_meta_sync: {
        Args: {
          p_meta_account_id: string
          p_sync_log_id: string
          p_lock_owner: string
          p_failed_at: string
          p_token_status: MetaTokenStatus | null
          p_pages_fetched: number
          p_rate_limit_retries: number
          p_api_usage: Json
          p_message: string
          p_error_code: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: AppRole
      entity_status: EntityStatus
      offer_billing_type: OfferBillingType
      offer_kind: OfferKind
      client_offer_status: ClientOfferStatus
      payment_entry_status: PaymentEntryStatus
      payment_method: PaymentMethod
      meta_connection_status: MetaConnectionStatus
      meta_token_status: MetaTokenStatus
      sync_status: SyncStatus
      sync_trigger: SyncTrigger
      reporting_scope: ReportingScope
      reporting_period_key: ReportingPeriodKey
    }
    CompositeTypes: Record<string, never>
  }
}
