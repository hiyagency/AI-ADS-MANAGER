export const META_ATTRIBUTION_WINDOWS = [
  '1d_click',
  '7d_click',
  '28d_click',
  '1d_view',
  '7d_view',
  '28d_view',
] as const

export type MetaAttributionWindow = typeof META_ATTRIBUTION_WINDOWS[number]

const DEFAULT_ATTRIBUTION_WINDOWS: MetaAttributionWindow[] = ['7d_click', '1d_view']

export function parseMetaAttributionWindows(value?: string | null): MetaAttributionWindow[] {
  if (!value?.trim()) return [...DEFAULT_ATTRIBUTION_WINDOWS]
  const requested = [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
  const invalid = requested.filter((item) => !META_ATTRIBUTION_WINDOWS.includes(item as MetaAttributionWindow))
  if (invalid.length) throw new Error(`Unsupported Meta attribution window: ${invalid.join(', ')}.`)
  if (!requested.length) throw new Error('At least one Meta attribution window is required.')
  return requested as MetaAttributionWindow[]
}

export function metaAttributionKey(windows: readonly MetaAttributionWindow[]) {
  return windows.join('+')
}

export function parseMetaLookbackDays(value?: string | null) {
  const days = value?.trim() ? Number(value) : 35
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new Error('META_SYNC_LOOKBACK_DAYS must be a whole number from 1 to 90.')
  }
  return days
}
