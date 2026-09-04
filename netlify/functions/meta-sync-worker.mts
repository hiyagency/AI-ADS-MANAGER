import type { Config, Context } from '@netlify/functions'
import { normalizeInsight, normalizeMetaAccountStatus, moneyFromMinorUnits, type MetaInsight } from '../../src/meta/normalizers.js'
import { metaAttributionKey, parseMetaAttributionWindows, parseMetaLookbackDays } from '../../src/meta/config.js'
import { reportingPeriods } from '../../src/meta/reportingPeriods.js'
import type { Campaign, Database, Json, MetaTokenStatus } from '../../src/types/database.js'
import { fetchGraphCollectionWithMeta, fetchGraphObjectWithMeta, MetaGraphError } from './_lib/metaGraph.js'
import { adminClient, assertInternalRequest, errorMessage, optionalServerValue, requirePost } from './_lib/server.js'

type MetaAccountObject = { id: string; name?: string; currency?: string; timezone_name?: string; account_status?: number | string; business?: { name?: string } }
type MetaCampaign = { id: string; name?: string; objective?: string; status?: string; effective_status?: string; start_time?: string; stop_time?: string }
type MetaAdSet = { id: string; name?: string; campaign_id?: string; status?: string; effective_status?: string; daily_budget?: string; lifetime_budget?: string; optimization_goal?: string; billing_event?: string }
type MetaAd = { id: string; name?: string; adset_id?: string; campaign_id?: string; status?: string; effective_status?: string; creative?: { id?: string } }

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function dateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

const aggregateInsightFields = 'campaign_id,date_start,date_stop,spend,reach,impressions,frequency,clicks,inline_link_clicks,ctr,cpc,cpm,actions,video_play_actions,video_thruplay_watched_actions'

function snapshotMetrics(insight: MetaInsight, attributionWindows: readonly string[]) {
  const { metric_date: _metricDate, ...metrics } = normalizeInsight(insight, attributionWindows)
  return metrics
}

export default async (request: Request, context: Context) => {
  try {
    requirePost(request)
    assertInternalRequest(request)
  } catch (error) {
    if (error instanceof Response) return
    throw error
  }

  const body = await request.json().catch(() => null) as { metaAccountId?: string; syncLogId?: string } | null
  if (!body?.metaAccountId || !body.syncLogId || !uuidPattern.test(body.metaAccountId) || !uuidPattern.test(body.syncLogId)) return

  const admin = adminClient()
  const lockOwner = (context.requestId?.trim() || crypto.randomUUID()).slice(0, 128)
  const { data: account, error: claimError } = await admin.rpc('claim_meta_sync', {
    p_meta_account_id: body.metaAccountId,
    p_sync_log_id: body.syncLogId,
    p_lock_owner: lockOwner,
  }).maybeSingle()
  if (claimError) throw new Error('The Meta account synchronization claim failed.')

  if (!account) {
    const { data: existingLog, error: logReadError } = await admin.from('sync_logs')
      .select('status')
      .eq('id', body.syncLogId)
      .eq('meta_account_id', body.metaAccountId)
      .maybeSingle()
    if (logReadError) throw new Error('The synchronization claim result could not be inspected.')
    if (!existingLog || existingLog.status === 'running' || existingLog.status === 'succeeded') return
    if (existingLog.status === 'failed') throw new Error('The retried synchronization could not acquire its client lease.')

    const skippedAt = new Date().toISOString()
    const { error: skippedError } = await admin.from('sync_logs').update({
      status: 'partial',
      completed_at: skippedAt,
      message: 'Skipped because another synchronization already holds the client lease or the mapping is inactive.',
      error_code: 'client_locked',
    }).eq('id', body.syncLogId).eq('meta_account_id', body.metaAccountId).eq('status', 'queued')
    if (skippedError) throw new Error('The skipped synchronization could not be recorded.')
    return
  }

  const now = new Date()
  const attributionWindows = parseMetaAttributionWindows(optionalServerValue('META_ATTRIBUTION_WINDOWS'))
  const attributionWindow = metaAttributionKey(attributionWindows)
  const lookbackDays = parseMetaLookbackDays(optionalServerValue('META_SYNC_LOOKBACK_DAYS'))
  let pagesFetched = 0
  let rateLimitRetries = 0
  let apiUsage: Json = {}

  try {
    const accountPath = `act_${account.external_account_id}`
    const since = new Date(now)
    since.setUTCDate(since.getUTCDate() - (lookbackDays - 1))

    const [accountResponse, campaignResponse, adSetResponse, adResponse, insightResponse] = await Promise.all([
      fetchGraphObjectWithMeta<MetaAccountObject>(accountPath, { fields: 'id,name,currency,timezone_name,account_status,business{name}' }),
      fetchGraphCollectionWithMeta<MetaCampaign>(`${accountPath}/campaigns`, { fields: 'id,name,objective,status,effective_status,start_time,stop_time' }),
      fetchGraphCollectionWithMeta<MetaAdSet>(`${accountPath}/adsets`, { fields: 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event' }),
      fetchGraphCollectionWithMeta<MetaAd>(`${accountPath}/ads`, { fields: 'id,name,adset_id,campaign_id,status,effective_status,creative{id}' }),
      fetchGraphCollectionWithMeta<MetaInsight>(`${accountPath}/insights`, {
        level: 'campaign',
        time_increment: '1',
        time_range: JSON.stringify({ since: dateString(since), until: dateString(now) }),
        action_attribution_windows: JSON.stringify(attributionWindows),
        use_account_attribution_setting: 'false',
        fields: 'campaign_id,date_start,spend,reach,impressions,frequency,clicks,inline_link_clicks,ctr,cpc,cpm,actions,video_play_actions,video_thruplay_watched_actions',
      }),
    ])
    const accountObject = accountResponse.data
    const remoteAccountStatus = normalizeMetaAccountStatus(accountObject.account_status)
    const metaCampaigns = campaignResponse.data
    const metaAdSets = adSetResponse.data
    const metaAds = adResponse.data
    const insights = insightResponse.data
    pagesFetched = 1 + campaignResponse.pages + adSetResponse.pages + adResponse.pages + insightResponse.pages
    rateLimitRetries = accountResponse.retries + campaignResponse.retries + adSetResponse.retries + adResponse.retries + insightResponse.retries
    apiUsage = JSON.parse(JSON.stringify({
      account: accountResponse.usage,
      campaigns: campaignResponse.usage,
      adSets: adSetResponse.usage,
      ads: adResponse.usage,
      insights: insightResponse.usage,
    })) as Json

    const syncedAt = new Date().toISOString()
    const campaignRows = metaCampaigns.map((campaign) => ({
      client_id: account.client_id,
      meta_account_id: account.id,
      external_id: campaign.id,
      name: campaign.name?.trim() || `Campaign ${campaign.id}`,
      objective: campaign.objective ?? null,
      configured_status: campaign.status ?? 'UNKNOWN',
      effective_status: campaign.effective_status ?? 'UNKNOWN',
      starts_at: campaign.start_time ?? null,
      ends_at: campaign.stop_time ?? null,
      synced_at: syncedAt,
      last_seen_at: syncedAt,
      is_current: true,
    }))
    const campaignResult = campaignRows.length
      ? await admin.from('campaigns').upsert(campaignRows, { onConflict: 'meta_account_id,external_id' }).select('*')
      : { data: [] as Campaign[], error: null }
    if (campaignResult.error) throw new Error('Campaign records could not be stored.')
    const campaigns = (campaignResult.data ?? []) as Campaign[]
    const campaignByExternal = new Map(campaigns.map((campaign) => [campaign.external_id, campaign]))

    const snapshotRows: Database['public']['Tables']['reporting_snapshots']['Insert'][] = []
    const snapshotUsage: Record<string, Json> = {}
    const accountTimeZone = accountObject.timezone_name?.trim() || account.timezone_name
    for (const period of reportingPeriods(now, accountTimeZone)) {
      const parameters = {
        ...period.parameters,
        action_attribution_windows: JSON.stringify(attributionWindows),
        use_account_attribution_setting: 'false',
        fields: aggregateInsightFields,
      }
      const [accountPeriod, campaignPeriod] = await Promise.all([
        fetchGraphCollectionWithMeta<MetaInsight>(`${accountPath}/insights`, { ...parameters, level: 'account' }),
        fetchGraphCollectionWithMeta<MetaInsight>(`${accountPath}/insights`, { ...parameters, level: 'campaign' }),
      ])
      pagesFetched += accountPeriod.pages + campaignPeriod.pages
      rateLimitRetries += accountPeriod.retries + campaignPeriod.retries
      snapshotUsage[period.key] = JSON.parse(JSON.stringify({
        account: accountPeriod.usage,
        campaigns: campaignPeriod.usage,
      })) as Json

      const accountInsight = accountPeriod.data[0] ?? {}
      snapshotRows.push({
        client_id: account.client_id,
        meta_account_id: account.id,
        campaign_id: null,
        scope_type: 'account',
        scope_external_id: account.external_account_id,
        period_key: period.key,
        period_start: accountInsight.date_start ?? period.fallbackStart,
        period_end: accountInsight.date_stop ?? period.end,
        attribution_window: attributionWindow,
        synced_at: syncedAt,
        ...snapshotMetrics(accountInsight, attributionWindows),
      })

      const insightByCampaign = new Map(campaignPeriod.data.flatMap((insight) => insight.campaign_id ? [[insight.campaign_id, insight] as const] : []))
      campaigns.forEach((campaign) => {
        const insight = insightByCampaign.get(campaign.external_id) ?? {}
        snapshotRows.push({
          client_id: account.client_id,
          meta_account_id: account.id,
          campaign_id: campaign.id,
          scope_type: 'campaign',
          scope_external_id: campaign.external_id,
          period_key: period.key,
          period_start: insight.date_start ?? period.fallbackStart,
          period_end: insight.date_stop ?? period.end,
          attribution_window: attributionWindow,
          synced_at: syncedAt,
          ...snapshotMetrics(insight, attributionWindows),
        })
      })
    }
    apiUsage = JSON.parse(JSON.stringify({ ...apiUsage as Record<string, Json>, reportingPeriods: snapshotUsage })) as Json

    for (let index = 0; index < snapshotRows.length; index += 500) {
      const { error: snapshotError } = await admin.from('reporting_snapshots').upsert(
        snapshotRows.slice(index, index + 500),
        { onConflict: 'meta_account_id,scope_type,scope_external_id,period_key,attribution_window' },
      )
      if (snapshotError) throw new Error('Exact reporting-window snapshots could not be stored.')
    }

    const adSetRows = metaAdSets.flatMap((adSet) => {
      const campaign = campaignByExternal.get(adSet.campaign_id ?? '')
      return campaign ? [{
        client_id: account.client_id,
        campaign_id: campaign.id,
        meta_account_id: account.id,
        external_id: adSet.id,
        name: adSet.name?.trim() || `Ad set ${adSet.id}`,
        configured_status: adSet.status ?? 'UNKNOWN',
        effective_status: adSet.effective_status ?? 'UNKNOWN',
        daily_budget: adSet.daily_budget ? moneyFromMinorUnits(adSet.daily_budget) : null,
        lifetime_budget: adSet.lifetime_budget ? moneyFromMinorUnits(adSet.lifetime_budget) : null,
        optimization_goal: adSet.optimization_goal ?? null,
        billing_event: adSet.billing_event ?? null,
        synced_at: syncedAt,
        last_seen_at: syncedAt,
        is_current: true,
      }] : []
    })
    const adSetResult = adSetRows.length ? await admin.from('ad_sets').upsert(adSetRows, { onConflict: 'meta_account_id,external_id' }).select('*') : { data: [], error: null }
    if (adSetResult.error) throw new Error('Ad set records could not be stored.')
    const adSetByExternal = new Map((adSetResult.data ?? []).map((adSet) => [adSet.external_id, adSet]))

    const adRows = metaAds.flatMap((ad) => {
      const campaign = campaignByExternal.get(ad.campaign_id ?? '')
      const adSet = adSetByExternal.get(ad.adset_id ?? '')
      return campaign && adSet ? [{
        client_id: account.client_id,
        ad_set_id: adSet.id,
        campaign_id: campaign.id,
        meta_account_id: account.id,
        external_id: ad.id,
        name: ad.name?.trim() || `Ad ${ad.id}`,
        configured_status: ad.status ?? 'UNKNOWN',
        effective_status: ad.effective_status ?? 'UNKNOWN',
        creative_external_id: ad.creative?.id ?? null,
        synced_at: syncedAt,
        last_seen_at: syncedAt,
        is_current: true,
      }] : []
    })
    const adResult = adRows.length ? await admin.from('ads').upsert(adRows, { onConflict: 'meta_account_id,external_id' }) : { error: null }
    if (adResult.error) throw new Error('Ad records could not be stored.')

    const metricRows = insights.flatMap((insight) => {
      const campaign = campaignByExternal.get(insight.campaign_id ?? '')
      const normalized = normalizeInsight(insight, attributionWindows)
      return campaign && normalized.metric_date ? [{
        client_id: account.client_id,
        meta_account_id: account.id,
        campaign_id: campaign.id,
        attribution_window: attributionWindow,
        synced_at: syncedAt,
        ...normalized,
      }] : []
    })
    const metricResult = metricRows.length ? await admin.from('daily_metrics').upsert(metricRows, { onConflict: 'campaign_id,metric_date,attribution_window' }) : { error: null }
    if (metricResult.error) throw new Error('Daily campaign metrics could not be stored.')

    const staleResults = await Promise.all([
      admin.from('ads').update({ is_current: false, synced_at: syncedAt }).eq('meta_account_id', account.id).eq('is_current', true).lt('last_seen_at', syncedAt),
      admin.from('ad_sets').update({ is_current: false, synced_at: syncedAt }).eq('meta_account_id', account.id).eq('is_current', true).lt('last_seen_at', syncedAt),
      admin.from('campaigns').update({ is_current: false, synced_at: syncedAt }).eq('meta_account_id', account.id).eq('is_current', true).lt('last_seen_at', syncedAt),
    ])
    if (staleResults.some((result) => result.error)) throw new Error('Stale Meta entities could not be reconciled.')

    const recordsSynced = campaignRows.length + adSetRows.length + adRows.length + metricRows.length + snapshotRows.length
    const message = `Synchronized ${recordsSynced} records across ${pagesFetched} Meta pages.`
    const { data: completed, error: completionError } = await admin.rpc('complete_meta_sync', {
      p_meta_account_id: account.id,
      p_sync_log_id: body.syncLogId,
      p_lock_owner: lockOwner,
      p_synced_at: syncedAt,
      p_name: (accountObject.name?.trim() || account.name).slice(0, 160),
      p_currency_code: accountObject.currency && /^[A-Z]{3}$/.test(accountObject.currency) ? accountObject.currency : account.currency_code,
      p_timezone_name: (accountObject.timezone_name ?? account.timezone_name).slice(0, 80),
      p_business_name: accountObject.business?.name?.trim().slice(0, 200) || account.business_name,
      p_remote_account_status: remoteAccountStatus,
      p_records_synced: recordsSynced,
      p_pages_fetched: pagesFetched,
      p_rate_limit_retries: rateLimitRetries,
      p_api_usage: apiUsage,
      p_message: message,
    })
    if (completionError || completed !== true) throw new Error('The synchronization result could not be finalized by its lock owner.')
    console.info(message)
  } catch (error) {
    const message = errorMessage(error, 'Meta synchronization failed.').slice(0, 500)
    const isRateLimited = error instanceof MetaGraphError && (error.status === 429 || [4, 17, 32, 341, 613, 80004].includes(error.code ?? 0))
    const code = isRateLimited ? 'meta_rate_limited' : error instanceof MetaGraphError && error.code ? `meta_${error.code}` : 'sync_failed'
    const tokenStatus: MetaTokenStatus | null = error instanceof MetaGraphError && error.code === 190 ? 'expired' : null
    const failedAt = new Date().toISOString()
    const { data: failed, error: failureError } = await admin.rpc('fail_meta_sync', {
      p_meta_account_id: account.id,
      p_sync_log_id: body.syncLogId,
      p_lock_owner: lockOwner,
      p_failed_at: failedAt,
      p_token_status: tokenStatus,
      p_pages_fetched: pagesFetched,
      p_rate_limit_retries: error instanceof MetaGraphError ? error.retries : rateLimitRetries,
      p_api_usage: apiUsage,
      p_message: message,
      p_error_code: code,
    })
    if (failureError || failed !== true) console.error('The failed synchronization could not be finalized by its lock owner.')
    throw error
  }
}

export const config: Config = { path: '/api/meta-sync-worker', background: true }
