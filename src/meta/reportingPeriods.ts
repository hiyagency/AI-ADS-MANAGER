import type { ReportingPeriodKey } from '../types/database.js'

export type MetaReportingPeriod = {
  key: ReportingPeriodKey
  fallbackStart: string
  end: string
  parameters: { time_range: string } | { date_preset: 'maximum' }
}

export function dateInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
  const year = part('year')
  const month = part('month')
  const day = part('day')
  if (!year || !month || !day) throw new Error(`The Meta account timezone ${timeZone} could not be resolved.`)
  return `${year}-${month}-${day}`
}

export function shiftDate(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return shifted.toISOString().slice(0, 10)
}

export function reportingPeriods(now: Date, timeZone: string): MetaReportingPeriod[] {
  const end = dateInTimeZone(now, timeZone)
  const range = (key: ReportingPeriodKey, fallbackStart: string): MetaReportingPeriod => ({
    key,
    fallbackStart,
    end,
    parameters: { time_range: JSON.stringify({ since: fallbackStart, until: end }) },
  })

  return [
    range('7d', shiftDate(end, -6)),
    range('14d', shiftDate(end, -13)),
    range('28d', shiftDate(end, -27)),
    range('month', `${end.slice(0, 7)}-01`),
    { key: 'lifetime', fallbackStart: end, end, parameters: { date_preset: 'maximum' } },
  ]
}
