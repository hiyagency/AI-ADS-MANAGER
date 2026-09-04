import { describe, expect, it } from 'vitest'
import { DAILY_BUDGET_TIERS } from '../types'
import { BASIC_CREATIVE_FEE, calculatePricing, GST_RATE, PACKAGE_DAYS, SERVICE_RATE } from './pricing'
const expectedTotals = [10920.8, 19841.6, 28762.4, 37683.2, 44373.8, 57755, 68906]
describe('calculatePricing', () => {
  it.each(DAILY_BUDGET_TIERS.map((tier, index) => [tier, expectedTotals[index]] as const))('calculates the complete 28-day package for ₹%i/day', (tier, expectedTotal) => {
    const result = calculatePricing(tier)
    expect(result.metaSpend).toBe(tier * PACKAGE_DAYS)
    expect(result.gst).toBe(result.metaSpend * GST_RATE)
    expect(result.serviceFee).toBe(result.afterTaxMetaSpend * SERVICE_RATE)
    expect(result.creativeFee).toBe(BASIC_CREATIVE_FEE)
    expect(result.total).toBeCloseTo(expectedTotal, 2)
    expect(result.total).toBeCloseTo(result.metaSpend + result.gst + result.serviceFee + result.creativeFee, 2)
  })
})
