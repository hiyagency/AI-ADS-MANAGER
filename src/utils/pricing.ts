import type { DailyBudgetTier, PricingCalculation } from '../types'
export const PACKAGE_DAYS = 28 as const
export const GST_RATE = 0.18
export const SERVICE_RATE = 0.35
export const BASIC_CREATIVE_FEE = 2000
export function calculatePricing(dailyMetaBudget: DailyBudgetTier): PricingCalculation {
  const metaSpend = dailyMetaBudget * PACKAGE_DAYS
  const gst = metaSpend * GST_RATE
  const afterTaxMetaSpend = metaSpend + gst
  const serviceFee = afterTaxMetaSpend * SERVICE_RATE
  const total = afterTaxMetaSpend + serviceFee + BASIC_CREATIVE_FEE
  return { dailyMetaBudget, durationDays: PACKAGE_DAYS, metaSpend, gst, afterTaxMetaSpend, serviceFee, creativeFee: BASIC_CREATIVE_FEE, total, effectiveDailyTotal: total / PACKAGE_DAYS }
}
export const formatInr = (value: number, digits = 0) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
export const formatCompact = (value: number) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
