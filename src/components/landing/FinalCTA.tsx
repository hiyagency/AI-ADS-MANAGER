import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { ScrollReveal } from '../ui/ScrollReveal'

export function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="final-cta__grid" aria-hidden />
      <div className="container-shell">
        <ScrollReveal className="final-cta__content">
          <div className="final-cta__mark"><img src="/hiy-agency-logo.jpg" alt="HIY Agency" /></div>
          <p className="eyebrow"><span />YOUR CAMPAIGN COMMAND LAYER</p>
          <h2>Already advertising with HIY?</h2>
          <p>Your performance signal is one secure login away.</p>
          <Button to="/login">ACCESS YOUR DASHBOARD <ArrowRight size={16} /></Button>
        </ScrollReveal>
      </div>
    </section>
  )
}
