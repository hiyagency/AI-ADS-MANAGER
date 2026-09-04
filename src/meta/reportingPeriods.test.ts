import { describe, expect, it } from 'vitest'
import { dateInTimeZone, reportingPeriods, shiftDate } from './reportingPeriods'

describe('Meta reporting periods', () => {
  it('uses the Meta account timezone instead of the worker UTC date', () => {
    const instant = new Date('2026-09-03T19:30:00.000Z')
    expect(dateInTimeZone(instant, 'Asia/Kolkata')).toBe('2026-09-04')
    expect(dateInTimeZone(instant, 'America/Los_Angeles')).toBe('2026-09-03')
  })

  it('builds inclusive dashboard windows and a Meta maximum request', () => {
    const periods = reportingPeriods(new Date('2026-09-04T06:00:00.000Z'), 'Asia/Kolkata')
    expect(periods.map((period) => period.key)).toEqual(['7d', '14d', '28d', 'month', 'lifetime'])
    expect(periods[0]).toMatchObject({ fallbackStart: '2026-08-29', end: '2026-09-04' })
    expect(periods[3]).toMatchObject({ fallbackStart: '2026-09-01', end: '2026-09-04' })
    expect(periods[4].parameters).toEqual({ date_preset: 'maximum' })
  })

  it('shifts cleanly across month and leap-year boundaries', () => {
    expect(shiftDate('2028-03-01', -1)).toBe('2028-02-29')
  })
})
