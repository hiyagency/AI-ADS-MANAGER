import { describe, expect, it } from 'vitest'
import { metaAttributionKey, parseMetaAttributionWindows, parseMetaLookbackDays } from './config'

describe('Meta synchronization configuration', () => {
  it('uses the reporting default without inventing an attribution result', () => {
    const windows = parseMetaAttributionWindows()
    expect(windows).toEqual(['7d_click', '1d_view'])
    expect(metaAttributionKey(windows)).toBe('7d_click+1d_view')
  })

  it('deduplicates configured windows and rejects unsupported values', () => {
    expect(parseMetaAttributionWindows('1d_click,7d_click,1d_click')).toEqual(['1d_click', '7d_click'])
    expect(() => parseMetaAttributionWindows('7d_click,banana')).toThrow('Unsupported')
  })

  it('bounds the incremental lookback window', () => {
    expect(parseMetaLookbackDays()).toBe(35)
    expect(parseMetaLookbackDays('60')).toBe(60)
    expect(() => parseMetaLookbackDays('91')).toThrow('1 to 90')
  })
})
