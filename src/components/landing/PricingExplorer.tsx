import { ArrowRight, Check, ChevronDown, IndianRupee, Info, MessageCircleMore } from 'lucide-react'
import { type KeyboardEvent, useMemo, useState } from 'react'
import { NICHE_PRICING } from '../../data/pricing'
import { DAILY_BUDGET_TIERS, type DailyBudgetTier, type NicheCategory } from '../../types'
import { calculatePricing, formatInr } from '../../utils/pricing'
import { ScrollReveal } from '../ui/ScrollReveal'
import { SectionHeading } from '../ui/SectionHeading'

const categories: NicheCategory[] = ['Healthcare', 'Education', 'Retail', 'Lifestyle & Hospitality', 'Business & Property']

export function PricingExplorer() {
  const [nicheId, setNicheId] = useState('restaurant')
  const [budget, setBudget] = useState<DailyBudgetTier>(600)
  const niche = NICHE_PRICING.find((item) => item.id === nicheId) ?? NICHE_PRICING[0]
  const estimate = niche.estimates[budget]
  const pricing = calculatePricing(budget)
  const grouped = useMemo(() => categories.map((category) => ({ category, niches: NICHE_PRICING.filter((item) => item.category === category) })), [])

  const moveBudget = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % DAILY_BUDGET_TIERS.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + DAILY_BUDGET_TIERS.length) % DAILY_BUDGET_TIERS.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = DAILY_BUDGET_TIERS.length - 1
    setBudget(DAILY_BUDGET_TIERS[next])
    document.getElementById(`budget-${DAILY_BUDGET_TIERS[next]}`)?.focus()
  }

  return (
    <section id="offers" className="section pricing" data-testid="pricing-explorer">
      <div className="container-shell">
        <ScrollReveal><SectionHeading eyebrow="INTERACTIVE PACKAGE PLANNER" title="Choose the niche. Set the Meta budget. See the whole number." copy="Every estimate includes the compulsory GST, HIY service charge, and one basic high-quality video creative starting at ₹2,000." /></ScrollReveal>
        <ScrollReveal className="pricing-workbench">
          <aside className="niche-index" data-testid="niche-index" aria-label="Business niches">
            <div className="niche-index__head"><span>25 NICHE CHARTS</span><small>From {formatInr(calculatePricing(200).total, 2)} / 4 weeks</small></div>
            {grouped.map(({ category, niches }) => (
              <div className="niche-group" key={category}>
                <h3>{category}</h3>
                {niches.map((item) => (
                  <button className={item.id === niche.id ? 'is-active' : ''} onClick={() => setNicheId(item.id)} aria-pressed={item.id === niche.id} key={item.id}>
                    <span>{item.name}<small>{item.destination}</small></span>{item.id === niche.id ? <Check size={15} /> : <ArrowRight size={14} />}
                  </button>
                ))}
              </div>
            ))}
          </aside>
          <div className="pricing-stage">
            <label className="mobile-niche" data-testid="mobile-niche-select">
              <span>CHOOSE YOUR BUSINESS NICHE</span>
              <div><select value={niche.id} onChange={(event) => setNicheId(event.target.value)}>{grouped.map(({ category, niches }) => <optgroup label={category} key={category}>{niches.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</optgroup>)}</select><ChevronDown size={18} aria-hidden /></div>
            </label>
            <div className="budget-control" data-testid="budget-tier-control">
              <div className="budget-control__label"><span>DAILY META ADVERTISING BUDGET</span><small>Choose one of the chart's exact tiers</small></div>
              <div className="budget-radios" role="radiogroup" aria-label="Daily Meta advertising budget">
                {DAILY_BUDGET_TIERS.map((tier, index) => (
                  <button id={`budget-${tier}`} role="radio" aria-checked={budget === tier} aria-label={`${formatInr(tier)} per day`} tabIndex={budget === tier ? 0 : -1} className={budget === tier ? 'is-active' : ''} onClick={() => setBudget(tier)} onKeyDown={(event) => moveBudget(event, index)} key={tier}>
                    {formatInr(tier)}<small>/day</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="pricing-summary" data-testid="pricing-summary" aria-live="polite">
              <div className="pricing-summary__identity">
                <div><p className="micro-label">SELECTED NICHE</p><h3>{niche.name}</h3><span><MessageCircleMore size={14} /> Best destination: {niche.destination}</span></div>
                <div className="pricing-summary__rate"><span>QUALIFIED-RATE RANGE</span><strong>{niche.qualifiedRate.min}–{niche.qualifiedRate.max}%</strong></div>
              </div>
              <div className="estimate-display">
                <div><span>ESTIMATED ENQUIRIES</span><strong key={`${niche.id}-${budget}`}>{estimate.min}<i>–</i>{estimate.max}</strong><small>Over a four-week campaign</small></div>
                <div className="estimate-display__budget"><span>COMPLETE FOUR-WEEK PACKAGE</span><strong>{formatInr(pricing.total, 2)}</strong><small>{formatInr(pricing.effectiveDailyTotal, 2)} all-in daily equivalent</small></div>
              </div>
              <div className="package-ledger" data-testid="pricing-ledger">
                <div><span><i className="dot-meta" />Meta advertising spend<small>{formatInr(budget)} × 28 days</small></span><strong>{formatInr(pricing.metaSpend, 2)}</strong></div>
                <div><span><i className="dot-gst" />GST at 18%<small>Applied to Meta spend</small></span><strong>{formatInr(pricing.gst, 2)}</strong></div>
                <div><span><i className="dot-service" />HIY service charge at 35%<small>Calculated after GST</small></span><strong>{formatInr(pricing.serviceFee, 2)}</strong></div>
                <div><span><i className="dot-creative" />Basic video creative<small>One compulsory creative, starting price</small></span><strong>{formatInr(pricing.creativeFee, 2)}</strong></div>
              </div>
              <div className="pricing-summary__total"><span><IndianRupee size={20} /> TOTAL CLIENT INVESTMENT</span><strong>{formatInr(pricing.total, 2)}</strong></div>
              <div className="estimate-disclaimer"><Info size={16} /><p>This is a chart-based planning estimate, not a guaranteed result. Actual performance depends on targeting, geography, offer, competition, and creative quality.</p></div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
