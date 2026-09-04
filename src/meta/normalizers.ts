export type MetaAction = { action_type?: string; value?: string; [window: string]: string | undefined }

export type MetaInsight = {
  campaign_id?: string
  date_start?: string
  date_stop?: string
  spend?: string
  reach?: string
  impressions?: string
  frequency?: string
  clicks?: string
  inline_link_clicks?: string
  ctr?: string
  cpc?: string
  cpm?: string
  actions?: MetaAction[]
  video_play_actions?: MetaAction[]
  video_thruplay_watched_actions?: MetaAction[]
}

function number(value: string | number | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function isAvailable(value: string | number | undefined) {
  if (value == null || value === '') return false
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0
}

function actionValue(action: MetaAction, attributionWindows: readonly string[]) {
  if (isAvailable(action.value)) return number(action.value)
  return attributionWindows.reduce((sum, window) => sum + number(action[window]), 0)
}

export function moneyFromMinorUnits(value: string | number | undefined) {
  return Math.round(number(value)) / 100
}

export function normalizeMetaAccountStatus(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

export function actionTotal(
  actions: MetaAction[] | undefined,
  predicate: (type: string) => boolean,
  attributionWindows: readonly string[] = [],
) {
  return (actions ?? []).reduce(
    (sum, action) => predicate(action.action_type ?? '') ? sum + actionValue(action, attributionWindows) : sum,
    0,
  )
}

function rounded(value: number, precision = 4) {
  const multiplier = 10 ** precision
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}

export function normalizeInsight(insight: MetaInsight, attributionWindows: readonly string[] = []) {
  const actions = insight.actions ?? []
  const leads = actionTotal(actions, (type) => type === 'lead' || type.endsWith('_lead') || type.includes('lead_grouped'), attributionWindows)
  const messagingConversations = actionTotal(actions, (type) => type.includes('messaging_conversation_started'), attributionWindows)
  const purchases = actionTotal(actions, (type) => type === 'purchase' || type.endsWith('_purchase') || type.includes('omni_purchase'), attributionWindows)
  const registrations = actionTotal(actions, (type) => type.includes('complete_registration'), attributionWindows)
  const contacts = actionTotal(actions, (type) => type === 'contact' || type.endsWith('.contact'), attributionWindows)
  const linkClicks = Math.round(number(insight.inline_link_clicks))
  const resultCandidates: Array<[string, number]> = [
    ['messaging_conversation', messagingConversations],
    ['lead', leads],
    ['purchase', purchases],
    ['complete_registration', registrations],
    ['contact', contacts],
    ['link_click', linkClicks],
  ]
  const selectedResult = resultCandidates.find(([, value]) => value > 0)
  const results = selectedResult?.[1] ?? 0
  const resultType = selectedResult?.[0] ?? null
  const spend = number(insight.spend)
  const scalarMetrics: Array<[string, string | number | undefined]> = [
    ['spend', insight.spend],
    ['reach', insight.reach],
    ['impressions', insight.impressions],
    ['frequency', insight.frequency],
    ['clicks', insight.clicks],
    ['link_clicks', insight.inline_link_clicks],
    ['ctr', insight.ctr],
    ['cpc', insight.cpc],
    ['cpm', insight.cpm],
  ]
  const availableMetrics = scalarMetrics.flatMap(([name, value]) => isAvailable(value) ? [name] : [])

  if (insight.actions) availableMetrics.push('results', 'leads', 'messaging_conversations')
  if (insight.actions && isAvailable(insight.spend)) availableMetrics.push('cost_per_result')
  if (insight.video_play_actions) availableMetrics.push('video_plays')
  if (insight.video_thruplay_watched_actions) availableMetrics.push('video_thruplays')

  return {
    metric_date: insight.date_start ?? '',
    spend: rounded(spend, 2),
    reach: Math.round(number(insight.reach)),
    impressions: Math.round(number(insight.impressions)),
    frequency: rounded(number(insight.frequency)),
    clicks: Math.round(number(insight.clicks)),
    link_clicks: linkClicks,
    ctr: rounded(number(insight.ctr), 6),
    cpc: rounded(number(insight.cpc)),
    cpm: rounded(number(insight.cpm)),
    results: rounded(results, 2),
    result_type: resultType,
    cost_per_result: results ? rounded(spend / results) : 0,
    leads: rounded(leads, 2),
    messaging_conversations: rounded(messagingConversations, 2),
    video_plays: Math.round(actionTotal(insight.video_play_actions, () => true, attributionWindows)),
    video_thruplays: Math.round(actionTotal(insight.video_thruplay_watched_actions, () => true, attributionWindows)),
    available_metrics: [...new Set(availableMetrics)].sort(),
    result_breakdown: {
      leads: rounded(leads, 2),
      messaging_conversations: rounded(messagingConversations, 2),
      purchases: rounded(purchases, 2),
      registrations: rounded(registrations, 2),
      contacts: rounded(contacts, 2),
      link_clicks: linkClicks,
    },
  }
}

export function normalizeSnapshotInsight(
  insight: MetaInsight,
  fallbackStart: string,
  fallbackEnd: string,
  attributionWindows: readonly string[] = [],
) {
  const { metric_date: metricDate, ...metrics } = normalizeInsight(insight, attributionWindows)
  void metricDate
  return {
    period_start: insight.date_start || fallbackStart,
    period_end: insight.date_stop || fallbackEnd,
    ...metrics,
  }
}
