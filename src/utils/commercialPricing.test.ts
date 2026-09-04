import { describe, expect, it } from 'vitest'
import { calculateCatalogPricing, calculateCommercialPricing, roundMoney } from './commercialPricing'

describe('31-day commercial pricing', () => {
  it('matches the approved ₹600/day Month 1 formula exactly', () => {
    const result = calculateCommercialPricing({
      cycleDays: 31,
      dailyBudget: 600,
      serviceRate: 35,
      gstRate: 18,
      creativeUnitPrice: 2000,
      includedCreatives: 1,
      aiManagerFee: 0,
      additionalCharges: 0,
      discount: 0,
    })

    expect(result).toMatchObject({
      adBudget: 18600,
      serviceFee: 6510,
      gst: 3348,
      creativeCharge: 2000,
      grossTotal: 30458,
      total: 30458,
    })
  })

  it('applies custom charges, AI fee, and discount without paise drift', () => {
    const result = calculateCommercialPricing({
      cycleDays: 31,
      dailyBudget: 333.33,
      serviceRate: 35,
      gstRate: 18,
      creativeUnitPrice: 2000,
      includedCreatives: 2,
      aiManagerFee: 499,
      additionalCharges: 750.25,
      discount: 500.1,
    })

    expect(result.total).toBeCloseTo(
      result.adBudget + result.serviceFee + result.gst + result.creativeCharge
        + result.aiManagerFee + result.additionalCharges - result.discount,
      2,
    )
    expect(result.total).toBe(roundMoney(result.total))
  })

  it('calculates recurring and recommended production totals separately', () => {
    const result = calculateCatalogPricing({
      cycleDays: 31,
      dailyBudget: 1250,
      serviceRate: 35,
      gstRate: 18,
      creativeUnitPrice: 2000,
      includedCreatives: 1,
      aiManagerFee: 0,
      additionalCharges: 0,
      discount: 0,
      recurringAiManagerFee: 499,
      recommendedCreatives: 4,
    })

    expect(result.monthTwoBase).toBe(result.adBudget + result.serviceFee + result.gst + 499)
    expect(result.recommendedMonthOneTotal).toBe(result.total + 6000)
  })

  it('rejects impossible discounts and invalid rates', () => {
    const valid = {
      cycleDays: 31,
      dailyBudget: 200,
      serviceRate: 35,
      gstRate: 18,
      creativeUnitPrice: 2000,
      includedCreatives: 1,
      aiManagerFee: 0,
      additionalCharges: 0,
      discount: 20000,
    }
    expect(() => calculateCommercialPricing(valid)).toThrow('Discount cannot exceed')
    expect(() => calculateCommercialPricing({ ...valid, discount: 0, gstRate: 101 })).toThrow('cannot exceed')
  })
})
