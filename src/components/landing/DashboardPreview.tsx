import { ArrowUpRight, Check, Radio } from 'lucide-react'
import type { DailyBudgetTier, NichePricing } from '../../types'
import { calculatePricing, formatInr } from '../../utils/pricing'

export function DashboardPreview({ niche, budget = 600 }: { niche: NichePricing; budget?: DailyBudgetTier }) {
  const pricing = calculatePricing(budget)
  const estimate = niche.estimates[budget]
  return (
    <div className="cockpit" data-testid="campaign-graph">
      <div className="cockpit__topbar">
        <div className="window-dots" aria-hidden><span /><span /><span /></div>
        <div className="cockpit__status"><span /> LIVE ESTIMATE</div>
      </div>
      <div className="cockpit__head">
        <div>
          <p className="micro-label">FOUR-WEEK CAMPAIGN</p>
          <h3>{niche.name}</h3>
        </div>
        <div className="channel-chip"><Radio size={13} />{niche.destination}</div>
      </div>
      <div className="cockpit__primary">
        <div className="total-block">
          <span>COMPLETE PACKAGE</span>
          <strong>{formatInr(pricing.total)}</strong>
          <small>All compulsory charges included</small>
        </div>
        <div className="enquiry-block" aria-live="polite">
          <span>ESTIMATED ENQUIRIES</span>
          <strong key={niche.id}>{estimate.min}<i>–</i>{estimate.max}</strong>
          <small><Check size={13} /> {niche.qualifiedRate.min}–{niche.qualifiedRate.max}% qualified-rate range</small>
        </div>
      </div>
      <div className="cockpit__chart">
        <div className="chart-label"><span>Campaign signal</span><strong><ArrowUpRight size={14} /> +32.4%</strong></div>
        <svg viewBox="0 0 620 150" role="img" aria-label="Illustrative campaign performance trend">
          <defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1887ff" stopOpacity=".42"/><stop offset="1" stopColor="#1887ff" stopOpacity="0"/></linearGradient></defs>
          <path className="chart-grid" d="M0 30H620M0 75H620M0 120H620" />
          <path className="chart-area" d="M0 126 C55 118 72 105 112 109 C160 115 181 78 228 86 C278 95 305 58 350 64 C404 71 435 38 480 47 C525 55 556 18 620 24 L620 150 L0 150Z" />
          <path className="chart-line" d="M0 126 C55 118 72 105 112 109 C160 115 181 78 228 86 C278 95 305 58 350 64 C404 71 435 38 480 47 C525 55 556 18 620 24" />
          <circle cx="620" cy="24" r="5" className="chart-point" />
        </svg>
      </div>
      <div className="cockpit__ledger">
        <div><span>Meta spend</span><strong>{formatInr(pricing.metaSpend)}</strong></div>
        <div><span>GST</span><strong>{formatInr(pricing.gst)}</strong></div>
        <div><span>HIY service</span><strong>{formatInr(pricing.serviceFee)}</strong></div>
        <div><span>Creative</span><strong>from {formatInr(pricing.creativeFee)}</strong></div>
      </div>
      <p className="estimate-note">Chart-based planning estimate. Results are not guaranteed.</p>
    </div>
  )
}
