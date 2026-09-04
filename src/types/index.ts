export interface Offer { id: string; name: string; billingType: 'monthly' | 'one_time'; totalPrice: number; adBudget: number; serviceFee: number; creativeCharge: number; gst: number; additionalCharges?: number; active: boolean; public: boolean }
export interface PricingBreakdown { total: number; adBudget: number; serviceFee: number; creativeCharge: number; gst: number; additionalCharges: number }
export interface CampaignMetrics { spend: number; reach: number; impressions: number; clicks: number; ctr: number; cpc: number; cpm: number; results: number; costPerResult: number }

export type CommercialOfferKind = 'standard' | 'custom'
export type ClientOfferStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type PaymentEntryStatus = 'recorded' | 'voided'
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'card' | 'other'
export type DashboardDateRange = '7d' | '14d' | '28d' | 'month' | 'lifetime'

export interface CommercialPricingInput {
  cycleDays: number
  dailyBudget: number
  serviceRate: number
  gstRate: number
  creativeUnitPrice: number
  includedCreatives: number
  aiManagerFee: number
  additionalCharges: number
  discount: number
}

export interface CommercialPricingCalculation extends CommercialPricingInput {
  adBudget: number
  serviceFee: number
  gst: number
  creativeCharge: number
  grossTotal: number
  total: number
}

export interface CatalogPricingCalculation extends CommercialPricingCalculation {
  recurringAiManagerFee: number
  recommendedCreatives: number
  monthTwoBase: number
  recommendedMonthOneTotal: number
}

export const DAILY_BUDGET_TIERS = [200, 400, 600, 800, 950, 1250, 1500] as const
export type DailyBudgetTier = (typeof DAILY_BUDGET_TIERS)[number]
export type NicheCategory = 'Healthcare' | 'Education' | 'Retail' | 'Lifestyle & Hospitality' | 'Business & Property'
export interface EstimateRange { min: number; max: number }
export interface QualifiedRateRange { min: number; max: number }
export interface NichePricing { id: string; name: string; category: NicheCategory; destination: string; estimates: Record<DailyBudgetTier, EstimateRange>; qualifiedRate: QualifiedRateRange }
export interface PricingCalculation { dailyMetaBudget: DailyBudgetTier; durationDays: 28; metaSpend: number; gst: number; afterTaxMetaSpend: number; serviceFee: number; creativeFee: number; total: number; effectiveDailyTotal: number }
