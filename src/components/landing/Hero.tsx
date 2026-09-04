import { ArrowDownRight, ArrowRight, BadgeIndianRupee, BarChart3, MousePointer2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { FEATURED_NICHES } from '../../data/pricing'
import { Button } from '../ui/Button'
import { DashboardPreview } from './DashboardPreview'

export function Hero() {
  const [selectedId, setSelectedId] = useState(FEATURED_NICHES[0].id)
  const selected = FEATURED_NICHES.find((niche) => niche.id === selectedId) ?? FEATURED_NICHES[0]
  const heroRef = useRef<HTMLElement>(null)
  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return
    const rect = event.currentTarget.getBoundingClientRect()
    heroRef.current?.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
    heroRef.current?.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
  }
  return (
    <section className="hero hero-spotlight" data-testid="hero-spotlight" ref={heroRef} onPointerMove={handlePointerMove}>
      <div className="hero__grid" aria-hidden />
      <div className="hero__orb hero__orb--one" aria-hidden />
      <div className="hero__orb hero__orb--two" aria-hidden />
      <div className="container-shell hero__layout">
        <div className="hero__content">
          <img className="hero__logo" src="/hiy-agency-logo.jpg" alt="HIY Agency" />
          <p className="eyebrow"><span />CLIENT CAMPAIGN INTELLIGENCE</p>
          <h1>Track every rupee.<br /><em>Read every signal.</em></h1>
          <p className="hero__copy">Understand your full advertising investment, explore niche-specific enquiry estimates, and see campaign performance without opening Meta Ads Manager.</p>
          <div className="hero__actions">
            <Button to="/login">CLIENT LOGIN <ArrowRight size={16} /></Button>
            <a className="button button--secondary" href="#offers">EXPLORE PRICING <ArrowDownRight size={16} /></a>
          </div>
          <div className="hero__proof">
            <span><BadgeIndianRupee size={16} /> Complete breakdowns</span>
            <span><BarChart3 size={16} /> Chart-based estimates</span>
            <span><MousePointer2 size={16} /> Interactive planning</span>
          </div>
        </div>
        <div className="hero__visual">
          <div className="featured-selector" aria-label="Featured niche estimates">
            {FEATURED_NICHES.map((niche, index) => (
              <button key={niche.id} onClick={() => setSelectedId(niche.id)} className={selectedId === niche.id ? 'is-active' : ''} aria-pressed={selectedId === niche.id}>
                <span>0{index + 1}</span>{niche.name}
              </button>
            ))}
          </div>
          <DashboardPreview niche={selected} />
        </div>
      </div>
    </section>
  )
}
