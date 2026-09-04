import type { DashboardDateRange } from '../types'
import type { DailyMetric, ReportingSnapshot } from '../types/database'

export type MetricTotals = {
  spend: number
  reach: number
  impressions: number
  frequency: number
  clicks: number
  linkClicks: number
  ctr: number
  cpc: number
  cpm: number
  results: number
  costPerResult: number
  leads: number
  messagingConversations: number
  videoPlays: number
  videoThruplays: number
  availableMetrics: string[]
}

export const DASHBOARD_RANGES: { id: DashboardDateRange; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '14d', label: '14 days' },
  { id: '28d', label: '28 days' },
  { id: 'month', label: 'This month' },
  { id: 'lifetime', label: 'Lifetime' },
]

function dateOnly(value: Date) {
  const local = new Date(value.getTime() - (value.getTimezoneOffset() * 60_000))
  return local.toISOString().slice(0, 10)
}

export function rangeStart(range: DashboardDateRange, now = new Date()) {
  if (range === 'lifetime') return null
  if (range === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 28
  const start = new Date(now)
  start.setDate(start.getDate() - (days - 1))
  return dateOnly(start)
}

export function filterMetrics(metrics: DailyMetric[], range: DashboardDateRange, now = new Date()) {
  const start = rangeStart(range, now)
  const end = dateOnly(now)
  return metrics.filter((metric) => (!start || metric.metric_date >= start) && metric.metric_date <= end)
}

export function aggregateMetrics(metrics: DailyMetric[]): MetricTotals {
  const sums = metrics.reduce((total, metric) => ({
    spend: total.spend + metric.spend,
    reach: total.reach + metric.reach,
    impressions: total.impressions + metric.impressions,
    clicks: total.clicks + metric.clicks,
    linkClicks: total.linkClicks + metric.link_clicks,
    results: total.results + metric.results,
    leads: total.leads + metric.leads,
    messagingConversations: total.messagingConversations + metric.messaging_conversations,
    videoPlays: total.videoPlays + metric.video_plays,
    videoThruplays: total.videoThruplays + metric.video_thruplays,
  }), { spend: 0, reach: 0, impressions: 0, clicks: 0, linkClicks: 0, results: 0, leads: 0, messagingConversations: 0, videoPlays: 0, videoThruplays: 0 })

  return {
    ...sums,
    // Reach is unique within each Meta reporting request. Adding daily or
    // campaign-level reach double-counts people, so daily facts deliberately
    // never publish reach/frequency as a period total. Use reporting snapshots.
    reach: 0,
    frequency: 0,
    ctr: sums.impressions ? (sums.clicks / sums.impressions) * 100 : 0,
    cpc: sums.clicks ? sums.spend / sums.clicks : 0,
    cpm: sums.impressions ? (sums.spend / sums.impressions) * 1000 : 0,
    costPerResult: sums.results ? sums.spend / sums.results : 0,
    availableMetrics: [...new Set(metrics.flatMap((metric) => metric.available_metrics))]
      .filter((metric) => metric !== 'reach' && metric !== 'frequency')
      .sort(),
  }
}

export function snapshotsForRange(
  snapshots: ReportingSnapshot[],
  range: DashboardDateRange,
  scope: ReportingSnapshot['scope_type'],
) {
  return snapshots.filter((snapshot) => snapshot.period_key === range && snapshot.scope_type === scope)
}

export function aggregateSnapshots(snapshots: ReportingSnapshot[]): MetricTotals {
  const sums = snapshots.reduce((total, metric) => ({
    spend: total.spend + metric.spend,
    reach: total.reach + metric.reach,
    impressions: total.impressions + metric.impressions,
    clicks: total.clicks + metric.clicks,
    linkClicks: total.linkClicks + metric.link_clicks,
    results: total.results + metric.results,
    leads: total.leads + metric.leads,
    messagingConversations: total.messagingConversations + metric.messaging_conversations,
    videoPlays: total.videoPlays + metric.video_plays,
    videoThruplays: total.videoThruplays + metric.video_thruplays,
  }), { spend: 0, reach: 0, impressions: 0, clicks: 0, linkClicks: 0, results: 0, leads: 0, messagingConversations: 0, videoPlays: 0, videoThruplays: 0 })
  const only = snapshots.length === 1 ? snapshots[0] : null

  return {
    ...sums,
    frequency: only?.frequency ?? (sums.reach ? sums.impressions / sums.reach : 0),
    ctr: only?.ctr ?? (sums.impressions ? (sums.clicks / sums.impressions) * 100 : 0),
    cpc: only?.cpc ?? (sums.clicks ? sums.spend / sums.clicks : 0),
    cpm: only?.cpm ?? (sums.impressions ? (sums.spend / sums.impressions) * 1000 : 0),
    costPerResult: only?.cost_per_result ?? (sums.results ? sums.spend / sums.results : 0),
    availableMetrics: [...new Set(snapshots.flatMap((snapshot) => snapshot.available_metrics))].sort(),
  }
}

export function metricCoverage(metrics: DailyMetric[]) {
  if (!metrics.length) return null
  const dates = metrics.map((metric) => metric.metric_date).sort()
  return { start: dates[0], end: dates.at(-1) ?? dates[0] }
}
