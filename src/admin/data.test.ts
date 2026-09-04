import { describe, expect, it } from 'vitest'
import { formatInr, slugifyClientName } from './data'

describe('admin data helpers', () => {
  it('creates database-safe client slugs', () => {
    expect(slugifyClientName('  HIY Café & Fashion  ')).toBe('hiy-caf-fashion')
    expect(slugifyClientName('---New   Client---')).toBe('new-client')
  })

  it('formats whole rupees and auditable paise', () => {
    expect(formatInr(47058.5)).toBe('₹47,059')
    expect(formatInr(47058.5, true)).toBe('₹47,058.50')
  })
})
