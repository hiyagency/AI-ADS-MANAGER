import { supabase } from '../lib/supabase'
import type {
  Campaign,
  ClientMembership,
  ClientOffer,
  ClientSummary,
  Database,
  EntityStatus,
  MetaAccount,
  Offer,
  OfferBillingType,
  OfferCatalog,
  OfferCategory,
  OfferKind,
  PaymentEntry,
  PaymentMethod,
  Profile,
  SyncLog,
} from '../types/database'
import { calculateCatalogPricing, calculateCommercialPricing } from '../utils/commercialPricing'

export type AdminWorkspaceData = {
  clients: ClientSummary[]
  offers: Offer[]
  catalogs: OfferCatalog[]
  profiles: Profile[]
  memberships: ClientMembership[]
  clientOffers: ClientOffer[]
  payments: PaymentEntry[]
  metaAccounts: MetaAccount[]
  campaigns: Campaign[]
  syncLogs: SyncLog[]
}

export type ClientInput = {
  name: string
  slug: string
  status: EntityStatus
  contact_name: string
  contact_email: string
  contact_phone: string
}

export type OfferInput = {
  catalogId: string
  name: string
  slug: string
  description: string
  category: OfferCategory
  offerKind: OfferKind
  billingType: OfferBillingType
  cycleDays: number
  dailyBudget: number
  serviceRate: number
  gstRate: number
  creativeUnitPrice: number
  includedCreatives: number
  recommendedCreatives: number
  additionalCharges: number
  aiManagerMonthOneFee: number
  aiManagerRecurringFee: number
  active: boolean
  isPublic: boolean
  sortOrder: number
}

export type AssignmentInput = {
  clientId: string
  sourceOfferId: string | null
  name: string
  description: string
  offerKind: OfferKind
  billingType: OfferBillingType
  cycleDays: number
  dailyBudget: number
  serviceRate: number
  gstRate: number
  creativeUnitPrice: number
  includedCreatives: number
  aiManagerFee: number
  additionalCharges: number
  discount: number
  startsOn: string
  notes: string
}

export type PaymentInput = {
  clientOfferId: string
  clientId: string
  amount: number
  paidOn: string
  method: PaymentMethod
  reference: string
  notes: string
}

export type AvailableMetaAccount = {
  accountId: string
  name: string
  currencyCode: string
  timezoneName: string
  remoteStatus: number | null
  businessName: string | null
}

export type MetaTokenHealth = {
  status: MetaAccount['token_status']
  expiresAt: string | null
  dataAccessExpiresAt: string | null
  scopes: string[]
  missingRequiredScopes: string[]
  appId: string | null
  tokenType: string | null
}

function configuredClient() {
  if (!supabase) throw new Error('Supabase is not configured in this environment.')
  return supabase
}

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

export function slugifyClientName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatInr(value: number, withPaise = false) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: withPaise ? 2 : 0,
    maximumFractionDigits: withPaise ? 2 : 0,
  }).format(value)
}

export async function loadAdminWorkspace(): Promise<AdminWorkspaceData> {
  const client = configuredClient()
  const [
    clientsResult,
    offersResult,
    catalogsResult,
    profilesResult,
    membershipsResult,
    clientOffersResult,
    paymentsResult,
    metaAccountsResult,
    campaignsResult,
    syncLogsResult,
  ] = await Promise.all([
    client.from('clients').select('*').order('name'),
    client.from('offers').select('*').order('sort_order').order('created_at'),
    client.from('offer_catalogs').select('*').order('created_at', { ascending: false }),
    client.from('profiles').select('*').eq('role', 'client').order('email'),
    client.from('client_users').select('*').order('created_at'),
    client.from('client_offers').select('*').order('created_at', { ascending: false }),
    client.from('payment_entries').select('*').order('paid_on', { ascending: false }),
    client.from('meta_accounts').select('*').order('name'),
    client.from('campaigns').select('*').eq('is_current', true).order('updated_at', { ascending: false }),
    client.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(100),
  ])

  const error = clientsResult.error
    ?? offersResult.error
    ?? catalogsResult.error
    ?? profilesResult.error
    ?? membershipsResult.error
    ?? clientOffersResult.error
    ?? paymentsResult.error
    ?? metaAccountsResult.error
    ?? campaignsResult.error
    ?? syncLogsResult.error
  if (error) throw new Error(messageFrom(error, 'The admin workspace could not be loaded.'))

  return {
    clients: (clientsResult.data ?? []) as ClientSummary[],
    offers: (offersResult.data ?? []) as Offer[],
    catalogs: (catalogsResult.data ?? []) as OfferCatalog[],
    profiles: (profilesResult.data ?? []) as Profile[],
    memberships: (membershipsResult.data ?? []) as ClientMembership[],
    clientOffers: (clientOffersResult.data ?? []) as ClientOffer[],
    payments: (paymentsResult.data ?? []) as PaymentEntry[],
    metaAccounts: (metaAccountsResult.data ?? []) as MetaAccount[],
    campaigns: (campaignsResult.data ?? []) as Campaign[],
    syncLogs: (syncLogsResult.data ?? []) as SyncLog[],
  }
}

function nullable(value: string) {
  const next = value.trim()
  return next || null
}

export async function saveClient(input: ClientInput, id?: string) {
  const client = configuredClient()
  const payload: Database['public']['Tables']['clients']['Insert'] = {
    name: input.name.trim(),
    slug: slugifyClientName(input.slug),
    status: input.status,
    contact_name: nullable(input.contact_name),
    contact_email: nullable(input.contact_email)?.toLowerCase() ?? null,
    contact_phone: nullable(input.contact_phone),
  }

  const result = id
    ? await client.from('clients').update(payload).eq('id', id).select('*').single()
    : await client.from('clients').insert(payload).select('*').single()

  if (result.error) throw new Error(messageFrom(result.error, 'The client could not be saved.'))
  return result.data as ClientSummary
}

export async function setClientStatus(id: string, status: EntityStatus) {
  const client = configuredClient()
  const { error } = await client.from('clients').update({ status }).eq('id', id)
  if (error) throw new Error(messageFrom(error, 'The client status could not be changed.'))
}

export async function setProfileStatus(id: string, status: EntityStatus) {
  const client = configuredClient()
  const { error } = await client.from('profiles').update({ status }).eq('id', id)
  if (error) throw new Error(messageFrom(error, 'The login status could not be changed.'))
}

export async function attachClientUser(clientId: string, userId: string) {
  const client = configuredClient()
  const { error } = await client.from('client_users').insert({ client_id: clientId, user_id: userId })
  if (error) throw new Error(messageFrom(error, 'The login could not be attached to this client.'))
}

export async function detachClientUser(clientId: string, userId: string) {
  const client = configuredClient()
  const { error } = await client
    .from('client_users')
    .delete()
    .eq('client_id', clientId)
    .eq('user_id', userId)
  if (error) throw new Error(messageFrom(error, 'The login could not be detached.'))
}

export async function setOfferVisibility(id: string, field: 'active' | 'is_public', value: boolean) {
  const client = configuredClient()
  const payload: Database['public']['Tables']['offers']['Update'] = field === 'active'
    ? { active: value }
    : { is_public: value }
  const { error } = await client.from('offers').update(payload).eq('id', id)
  if (error) throw new Error(messageFrom(error, 'The offer visibility could not be changed.'))
}

export function slugifyOfferName(value: string) {
  return slugifyClientName(value)
}

export async function saveOffer(input: OfferInput, id?: string) {
  const client = configuredClient()
  const pricing = calculateCatalogPricing({
    cycleDays: input.cycleDays,
    dailyBudget: input.dailyBudget,
    serviceRate: input.serviceRate,
    gstRate: input.gstRate,
    creativeUnitPrice: input.creativeUnitPrice,
    includedCreatives: input.includedCreatives,
    aiManagerFee: input.aiManagerMonthOneFee,
    additionalCharges: input.additionalCharges,
    discount: 0,
    recurringAiManagerFee: input.aiManagerRecurringFee,
    recommendedCreatives: input.recommendedCreatives,
  })
  const payload: Database['public']['Tables']['offers']['Insert'] = {
    catalog_id: input.catalogId,
    name: input.name.trim(),
    slug: slugifyOfferName(input.slug),
    description: input.description.trim(),
    category: input.category,
    offer_kind: input.offerKind,
    billing_type: input.billingType,
    currency_code: 'INR',
    cycle_days: pricing.cycleDays,
    daily_budget: pricing.dailyBudget,
    ad_budget: pricing.adBudget,
    service_rate: pricing.serviceRate,
    service_fee: pricing.serviceFee,
    gst_rate: pricing.gstRate,
    gst: pricing.gst,
    creative_unit_price: pricing.creativeUnitPrice,
    included_creatives: pricing.includedCreatives,
    creative_charge: pricing.creativeCharge,
    additional_charges: pricing.additionalCharges,
    ai_manager_month_one_fee: pricing.aiManagerFee,
    ai_manager_recurring_fee: pricing.recurringAiManagerFee,
    month_one_total: pricing.total,
    month_two_base: pricing.monthTwoBase,
    recommended_creatives: pricing.recommendedCreatives,
    recommended_month_one_total: pricing.recommendedMonthOneTotal,
    active: input.active,
    is_public: input.isPublic,
    sort_order: input.sortOrder,
    archived_at: null,
  }

  const result = id
    ? await client.from('offers').update(payload).eq('id', id).select('*').single()
    : await client.from('offers').insert(payload).select('*').single()
  if (result.error) throw new Error(messageFrom(result.error, 'The offer could not be saved.'))
  return result.data as Offer
}

export async function duplicateOffer(offer: Offer) {
  const client = configuredClient()
  const uniqueSuffix = Date.now().toString(36).slice(-6)
  const payload: Database['public']['Tables']['offers']['Insert'] = {
    catalog_id: offer.catalog_id,
    slug: `${offer.slug}-copy-${uniqueSuffix}`,
    name: `${offer.name} copy`,
    description: offer.description,
    category: offer.category,
    offer_kind: 'custom',
    billing_type: offer.billing_type,
    currency_code: offer.currency_code,
    cycle_days: offer.cycle_days,
    daily_budget: offer.daily_budget,
    ad_budget: offer.ad_budget,
    service_rate: offer.service_rate,
    service_fee: offer.service_fee,
    gst_rate: offer.gst_rate,
    gst: offer.gst,
    creative_unit_price: offer.creative_unit_price,
    included_creatives: offer.included_creatives,
    creative_charge: offer.creative_charge,
    additional_charges: offer.additional_charges,
    ai_manager_month_one_fee: offer.ai_manager_month_one_fee,
    ai_manager_recurring_fee: offer.ai_manager_recurring_fee,
    month_one_total: offer.month_one_total,
    month_two_base: offer.month_two_base,
    recommended_creatives: offer.recommended_creatives,
    recommended_month_one_total: offer.recommended_month_one_total,
    active: false,
    is_public: false,
    sort_order: offer.sort_order + 1,
    source_offer_id: offer.id,
  }
  const { data, error } = await client.from('offers').insert(payload).select('*').single()
  if (error) throw new Error(messageFrom(error, 'The offer could not be duplicated.'))
  return data as Offer
}

export async function archiveOffer(id: string) {
  const client = configuredClient()
  const { error } = await client.from('offers').update({
    active: false,
    is_public: false,
    archived_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw new Error(messageFrom(error, 'The offer could not be archived.'))
}

export async function assignClientOffer(input: AssignmentInput) {
  const client = configuredClient()
  const pricing = calculateCommercialPricing(input)
  const { data, error } = await client.rpc('assign_client_offer', {
    p_client_id: input.clientId,
    p_source_offer_id: input.sourceOfferId,
    p_name: input.name.trim(),
    p_description: input.description.trim(),
    p_offer_kind: input.offerKind,
    p_billing_type: input.billingType,
    p_currency_code: 'INR',
    p_cycle_days: pricing.cycleDays,
    p_daily_budget: pricing.dailyBudget,
    p_ad_budget: pricing.adBudget,
    p_service_rate: pricing.serviceRate,
    p_service_fee: pricing.serviceFee,
    p_gst_rate: pricing.gstRate,
    p_gst: pricing.gst,
    p_creative_unit_price: pricing.creativeUnitPrice,
    p_included_creatives: pricing.includedCreatives,
    p_creative_charge: pricing.creativeCharge,
    p_ai_manager_fee: pricing.aiManagerFee,
    p_additional_charges: pricing.additionalCharges,
    p_discount: pricing.discount,
    p_gross_total: pricing.grossTotal,
    p_total: pricing.total,
    p_starts_on: input.startsOn,
    p_notes: input.notes.trim(),
  })
  if (error) throw new Error(messageFrom(error, 'The client offer could not be assigned.'))
  return data as ClientOffer
}

export async function setClientOfferStatus(id: string, status: ClientOffer['status']) {
  const client = configuredClient()
  const { error } = await client.from('client_offers').update({ status }).eq('id', id)
  if (error) throw new Error(messageFrom(error, 'The assignment status could not be changed.'))
}

export async function recordPayment(input: PaymentInput) {
  const client = configuredClient()
  const payload: Database['public']['Tables']['payment_entries']['Insert'] = {
    client_offer_id: input.clientOfferId,
    client_id: input.clientId,
    amount: input.amount,
    paid_on: input.paidOn,
    method: input.method,
    reference: nullable(input.reference),
    notes: input.notes.trim(),
  }
  const { data, error } = await client.from('payment_entries').insert(payload).select('*').single()
  if (error) throw new Error(messageFrom(error, 'The payment could not be recorded.'))
  return data as PaymentEntry
}

export async function voidPayment(id: string) {
  const client = configuredClient()
  const { error } = await client.from('payment_entries').update({ status: 'voided' }).eq('id', id)
  if (error) throw new Error(messageFrom(error, 'The payment could not be voided.'))
}

async function authenticatedFunction<T extends object = { message?: string }>(path: string, body: Record<string, unknown>) {
  const client = configuredClient()
  const { data: sessionData } = await client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Your secure session has expired. Sign in again.')

  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(result.error || 'The secure server action failed.')
  return result as T
}

export async function inviteClientUser(clientId: string, email: string, displayName: string) {
  return authenticatedFunction('/api/invite-client', {
    clientId,
    email: email.trim().toLowerCase(),
    displayName: displayName.trim(),
  })
}

export async function saveMetaAccount(input: {
  id?: string
  clientId: string
  externalAccountId: string
  name: string
  timezoneName: string
}) {
  return authenticatedFunction('/api/meta-account', input)
}

export async function discoverMetaAccounts() {
  return authenticatedFunction<{
    accounts: AvailableMetaAccount[]
    diagnostics: { pages: number; retries: number }
  }>('/api/meta-accounts-available', {})
}

export async function checkMetaTokenHealth() {
  return authenticatedFunction<{ health: MetaTokenHealth }>('/api/meta-token-health', {})
}

export async function disconnectMetaAccount(metaAccountId: string) {
  return authenticatedFunction<{ message: string }>('/api/meta-account-disconnect', { metaAccountId })
}

export async function requestMetaSync(metaAccountId: string) {
  return authenticatedFunction('/api/meta-sync', { metaAccountId })
}
