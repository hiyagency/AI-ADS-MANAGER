import { describe, expect, it } from 'vitest'
import type { DailyMetric, ReportingSnapshot } from '../types/database'
import { aggregateMetrics, aggregateSnapshots, filterMetrics, metricCoverage, rangeStart, snapshotsForRange } from './metrics'

const metric = (date: string, overrides: Partial<DailyMetric> = {}): DailyMetric => ({
  id: date,
  client_id: 'client',
  meta_account_id: 'account',
  campaign_id: 'campaign',
  metric_date: date,
  attribution_window: 'account_default',
  spend: 100,
  reach: 1000,
  impressions: 1500,
  frequency: 1.5,
  clicks: 30,
  link_clicks: 20,
  ctr: 2,
  cpc: 3.33,
  cpm: 66.67,
  results: 5,
  result_type: 'lead',
  cost_per_result: 20,
  leads: 5,
  messaging_conversations: 2,
  video_plays: 100,
  video_thruplays: 40,
  available_metrics: ['spend', 'reach', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'results', 'cost_per_result'],
  result_breakdown: {},
  synced_at: '2026-09-03T00:00:00Z',
  ...overrides,
})

const snapshot = (overrides: Partial<ReportingSnapshot> = {}): ReportingSnapshot => ({
  id: 'snapshot',
  client_id: 'client',
  meta_account_id: 'account',
  campaign_id: null,
  scope_type: 'account',
  scope_external_id: '123',
  period_key: '28d',
  period_start: '2026-08-07',
  period_end: '2026-09-03',
  attribution_window: 'account_default',
  spend: 300,
  reach: 1700,
  impressions: 3000,
  frequency: 1.7647,
  clicks: 50,
  link_clicks: 30,
  ctr: 1.666667,
  cpc: 6,
  cpm: 100,
  results: 15,
  result_type: 'lead',
  cost_per_result: 20,
  leads: 15,
  messaging_conversations: 4,
  video_plays: 200,
  video_thruplays: 80,
  available_metrics: ['spend', 'reach', 'impressions', 'frequency', 'clicks', 'ctr', 'cpc', 'cpm', 'results', 'cost_per_result'],
  result_breakdown: {},
  synced_at: '2026-09-03T00:00:00Z',
  ...overrides,
})

describe('client metric periods', () => {
  const now = new Date('2026-09-03T12:00:00+05:30')

  it('uses inclusive rolling windows and calendar month boundaries', () => {
    expect(rangeStart('7d', now)).toBe('2026-08-28')
    expect(rangeStart('month', now)).toBe('2026-09-01')
    expect(rangeStart('lifetime', now)).toBeNull()
  })

  it('filters future and out-of-range rows', () => {
    const rows = [metric('2026-08-27'), metric('2026-08-28'), metric('2026-09-03'), metric('2026-09-04')]
    expect(filterMetrics(rows, '7d', now).map((row) => row.metric_date)).toEqual(['2026-08-28', '2026-09-03'])
  })

  it('recomputes additive ratios without pretending daily reach is additive', () => {
    const result = aggregateMetrics([metric('2026-09-02'), metric('2026-09-03', { spend: 200, clicks: 20, results: 10 })])
    expect(result.spend).toBe(300)
    expect(result.results).toBe(15)
    expect(result.costPerResult).toBe(20)
    expect(result.cpc).toBe(6)
    expect(result.reach).toBe(0)
    expect(result.frequency).toBe(0)
    expect(result.availableMetrics).not.toContain('reach')
    expect(result.availableMetrics).toContain('results')
  })

  it('uses Meta-provided snapshots for exact non-additive period totals', () => {
    const result = aggregateSnapshots([snapshot()])
    expect(result.reach).toBe(1700)
    expect(result.frequency).toBe(1.7647)
    expect(result.spend).toBe(300)
    expect(result.availableMetrics).toContain('reach')
  })

  it('selects account and campaign snapshots independently', () => {
    const campaign = snapshot({ id: 'campaign-snapshot', scope_type: 'campaign', scope_external_id: 'campaign-1', campaign_id: 'campaign' })
    expect(snapshotsForRange([snapshot(), campaign], '28d', 'account')).toHaveLength(1)
    expect(snapshotsForRange([snapshot(), campaign], '28d', 'campaign')).toEqual([campaign])
  })

  it('reports the actual synchronized daily-history coverage', () => {
    expect(metricCoverage([metric('2026-09-03'), metric('2026-08-28')])).toEqual({ start: '2026-08-28', end: '2026-09-03' })
    expect(metricCoverage([])).toBeNull()
  })

  it('returns safe zero ratios when no metrics exist', () => {
    expect(aggregateMetrics([])).toMatchObject({ spend: 0, frequency: 0, ctr: 0, cpc: 0, cpm: 0, costPerResult: 0, availableMetrics: [] })
  })
})
