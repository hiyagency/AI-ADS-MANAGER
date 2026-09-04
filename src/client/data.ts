import { supabase } from '../lib/supabase'
import type {
  Campaign,
  ClientOffer,
  DailyMetric,
  MetaAccount,
  PaymentEntry,
  ReportingSnapshot,
  SyncLog,
} from '../types/database'

export type ClientDashboardData = {
  assignments: ClientOffer[]
  payments: PaymentEntry[]
  metaAccounts: MetaAccount[]
  campaigns: Campaign[]
  metrics: DailyMetric[]
  snapshots: ReportingSnapshot[]
  syncLogs: SyncLog[]
}

function configuredClient() {
  if (!supabase) throw new Error('Supabase is not configured in this environment.')
  return supabase
}

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

export async function loadClientDashboard(clientId: string): Promise<ClientDashboardData> {
  const client = configuredClient()
  const [assignments, payments, accounts, campaigns, metrics, snapshots, logs] = await Promise.all([
    client.from('client_offers').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    client.from('payment_entries').select('*').eq('client_id', clientId).order('paid_on', { ascending: false }),
    client.from('meta_accounts').select('*').eq('client_id', clientId).eq('active', true).order('name'),
    client.from('campaigns').select('*').eq('client_id', clientId).eq('is_current', true).order('updated_at', { ascending: false }),
    client.from('daily_metrics').select('*').eq('client_id', clientId).order('metric_date'),
    client.from('reporting_snapshots').select('*').eq('client_id', clientId),
    client.from('sync_logs').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(25),
  ])
  const error = assignments.error ?? payments.error ?? accounts.error ?? campaigns.error ?? metrics.error ?? snapshots.error ?? logs.error
  if (error) throw new Error(messageFrom(error, 'Your reporting workspace could not be loaded.'))

  return {
    assignments: (assignments.data ?? []) as ClientOffer[],
    payments: (payments.data ?? []) as PaymentEntry[],
    metaAccounts: (accounts.data ?? []) as MetaAccount[],
    campaigns: (campaigns.data ?? []) as Campaign[],
    metrics: (metrics.data ?? []) as DailyMetric[],
    snapshots: (snapshots.data ?? []) as ReportingSnapshot[],
    syncLogs: (logs.data ?? []) as SyncLog[],
  }
}
