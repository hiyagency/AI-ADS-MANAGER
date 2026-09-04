import { CheckCircle2, Info } from 'lucide-react'
import { calculatePricing, formatInr } from '../../utils/pricing'
import { ScrollReveal } from '../ui/ScrollReveal'
import { SectionHeading } from '../ui/SectionHeading'

const pricing = calculatePricing(600)
const items = [
  { label: 'Meta advertising spend', note: '₹600 per day × 28 days', value: pricing.metaSpend, className: 'allocation--meta' },
  { label: 'GST at 18%', note: 'Applied to Meta advertising spend', value: pricing.gst, className: 'allocation--gst' },
  { label: 'HIY service at 35%', note: 'Calculated after GST on Meta spend', value: pricing.serviceFee, className: 'allocation--service' },
  { label: 'Basic video creative', note: 'One compulsory creative, starting price', value: pricing.creativeFee, className: 'allocation--creative' },
]

export function BudgetTransparency() {
  return (
    <section id="transparency" className="section transparency">
      <div className="container-shell transparency__layout">
        <ScrollReveal className="transparency__story">
          <SectionHeading eyebrow="THE ₹28,762.40 QUESTION" title="Your payment is not the same as your Meta spend." copy="A complete package funds the campaign and the work around it. ADS MANAGER keeps each compulsory component visible." />
          <div className="transparency__promise"><CheckCircle2 size={20} /><p><strong>No hidden maths.</strong> Every displayed total is calculated from one shared pricing engine.</p></div>
          <div className="formula-line"><Info size={17} /><span>Service charge = 35% of Meta spend after 18% GST.</span></div>
        </ScrollReveal>
        <ScrollReveal className="allocation-panel">
          <div className="allocation-panel__head"><div><span>FOUR-WEEK PACKAGE</span><strong>{formatInr(pricing.total, 2)}</strong></div><span className="example-tag">₹600/DAY EXAMPLE</span></div>
          <div className="allocation-bar" aria-label="Package allocation bar">
            {items.map((item) => <span key={item.label} className={item.className} style={{ width: `${(item.value / pricing.total) * 100}%` }} />)}
          </div>
          <div className="pricing-ledger" data-testid="pricing-ledger">
            {items.map((item) => (
              <div className="pricing-ledger__row" key={item.label}>
                <span className={`ledger-dot ${item.className}`} />
                <div><strong>{item.label}</strong><small>{item.note}</small></div>
                <b>{formatInr(item.value, 2)}</b>
              </div>
            ))}
          </div>
          <div className="allocation-panel__total"><div><span>ALL-IN DAILY EQUIVALENT</span><strong>{formatInr(pricing.effectiveDailyTotal, 2)}</strong></div><div><span>ACTUAL META BUDGET</span><strong>{formatInr(pricing.metaSpend, 2)}</strong></div></div>
        </ScrollReveal>
      </div>
    </section>
  )
}
