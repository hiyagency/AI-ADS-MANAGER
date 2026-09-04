import { describe, expect, it } from 'vitest'
import { actionTotal, moneyFromMinorUnits, normalizeInsight, normalizeMetaAccountStatus, normalizeSnapshotInsight } from './normalizers'

describe('Meta response normalization', () => {
  it('converts account currency minor units without float drift', () => {
    expect(moneyFromMinorUnits('125050')).toBe(1250.5)
    expect(moneyFromMinorUnits(undefined)).toBe(0)
  })

  it('normalizes numeric Meta account status values safely', () => {
    expect(normalizeMetaAccountStatus('1')).toBe(1)
    expect(normalizeMetaAccountStatus(101)).toBe(101)
    expect(normalizeMetaAccountStatus('unknown')).toBeNull()
  })

  it('aggregates matching actions and prioritizes messaging results', () => {
    const insight = normalizeInsight({
      campaign_id: '42',
      date_start: '2026-09-03',
      spend: '500.00',
      actions: [
        { action_type: 'lead', value: '4' },
        { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '10' },
      ],
    })
    expect(insight).toMatchObject({ results: 10, result_type: 'messaging_conversation', leads: 4, messaging_conversations: 10, cost_per_result: 50 })
  })

  it('ignores malformed and negative external values', () => {
    expect(actionTotal([{ action_type: 'lead', value: '-4' }, { action_type: 'lead', value: 'nope' }], (type) => type === 'lead')).toBe(0)
  })

  it('uses selected attribution values when Meta omits the combined value', () => {
    const insight = normalizeInsight({
      campaign_id: '42',
      date_start: '2026-09-03',
      spend: '240',
      actions: [{ action_type: 'purchase', '7d_click': '2', '1d_view': '1' }],
    }, ['7d_click', '1d_view'])
    expect(insight).toMatchObject({
      results: 3,
      result_type: 'purchase',
      cost_per_result: 80,
    })
  })

  it('tracks which metrics were actually supplied instead of confusing missing data with zero', () => {
    const insight = normalizeInsight({
      campaign_id: '42',
      date_start: '2026-09-03',
      spend: '0',
      impressions: '100',
    })
    expect(insight.available_metrics).toEqual(['impressions', 'spend'])
    expect(insight.reach).toBe(0)
  })

  it('keeps Meta reporting-window dates on aggregate snapshots', () => {
    const insight = normalizeSnapshotInsight({
      date_start: '2026-08-07',
      date_stop: '2026-09-03',
      spend: '100',
    }, '2026-08-01', '2026-09-04')
    expect(insight).toMatchObject({ period_start: '2026-08-07', period_end: '2026-09-03', spend: 100 })
    expect(insight).not.toHaveProperty('metric_date')
  })
})
