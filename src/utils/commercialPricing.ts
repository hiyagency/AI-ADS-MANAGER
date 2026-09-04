import type {
  CatalogPricingCalculation,
  CommercialPricingCalculation,
  CommercialPricingInput,
} from '../types'

export const COMMERCIAL_DEFAULTS = Object.freeze({
  cycleDays: 31,
  serviceRate: 35,
  gstRate: 18,
  creativeUnitPrice: 2000,
  includedCreatives: 1,
  aiManagerFee: 0,
  additionalCharges: 0,
  discount: 0,
})

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function finiteNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`)
  return value
}

export function calculateCommercialPricing(input: CommercialPricingInput): CommercialPricingCalculation {
  const cycleDays = Math.trunc(finiteNonNegative(input.cycleDays, 'Cycle days'))
  const includedCreatives = Math.trunc(finiteNonNegative(input.includedCreatives, 'Included creatives'))
  const dailyBudget = roundMoney(finiteNonNegative(input.dailyBudget, 'Daily budget'))
  const serviceRate = finiteNonNegative(input.serviceRate, 'Service rate')
  const gstRate = finiteNonNegative(input.gstRate, 'GST rate')
  const creativeUnitPrice = roundMoney(finiteNonNegative(input.creativeUnitPrice, 'Creative unit price'))
  const aiManagerFee = roundMoney(finiteNonNegative(input.aiManagerFee, 'AI Manager fee'))
  const additionalCharges = roundMoney(finiteNonNegative(input.additionalCharges, 'Additional charges'))
  const discount = roundMoney(finiteNonNegative(input.discount, 'Discount'))

  if (cycleDays < 1 || cycleDays > 366) throw new Error('Cycle days must be between 1 and 366.')
  if (serviceRate > 100 || gstRate > 100) throw new Error('Percentage rates cannot exceed 100%.')

  const adBudget = roundMoney(dailyBudget * cycleDays)
  const serviceFee = roundMoney(adBudget * serviceRate / 100)
  const gst = roundMoney(adBudget * gstRate / 100)
  const creativeCharge = roundMoney(creativeUnitPrice * includedCreatives)
  const grossTotal = roundMoney(adBudget + serviceFee + gst + creativeCharge + aiManagerFee + additionalCharges)
  if (discount > grossTotal) throw new Error('Discount cannot exceed the gross total.')

  return {
    cycleDays,
    dailyBudget,
    serviceRate,
    gstRate,
    creativeUnitPrice,
    includedCreatives,
    aiManagerFee,
    additionalCharges,
    discount,
    adBudget,
    serviceFee,
    gst,
    creativeCharge,
    grossTotal,
    total: roundMoney(grossTotal - discount),
  }
}

export function calculateCatalogPricing(
  input: CommercialPricingInput & { recurringAiManagerFee: number; recommendedCreatives: number },
): CatalogPricingCalculation {
  const pricing = calculateCommercialPricing(input)
  const recurringAiManagerFee = roundMoney(finiteNonNegative(input.recurringAiManagerFee, 'Recurring AI Manager fee'))
  const recommendedCreatives = Math.trunc(finiteNonNegative(input.recommendedCreatives, 'Recommended creatives'))
  if (recommendedCreatives < pricing.includedCreatives) {
    throw new Error('Recommended creatives cannot be below the included creative count.')
  }

  return {
    ...pricing,
    recurringAiManagerFee,
    recommendedCreatives,
    monthTwoBase: roundMoney(
      pricing.adBudget
      + pricing.serviceFee
      + pricing.gst
      + pricing.additionalCharges
      + recurringAiManagerFee,
    ),
    recommendedMonthOneTotal: roundMoney(
      pricing.total + ((recommendedCreatives - pricing.includedCreatives) * pricing.creativeUnitPrice),
    ),
  }
}
