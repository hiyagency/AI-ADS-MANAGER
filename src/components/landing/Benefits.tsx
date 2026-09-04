import { ArrowUpRight, Clock3, Eye, MessageCircleMore, ReceiptIndianRupee } from 'lucide-react'
import { ScrollReveal } from '../ui/ScrollReveal'
import { SectionHeading } from '../ui/SectionHeading'

export function Benefits() {
  return (
    <section id="features" className="section benefits">
      <div className="container-shell">
        <ScrollReveal><SectionHeading eyebrow="WHAT CLIENTS ACTUALLY NEED" title="Less platform noise. More business signal." copy="One deliberate view of money, enquiries, and campaign momentum, shaped for decisions rather than ad-platform administration." /></ScrollReveal>
        <div className="benefits__bento">
          <ScrollReveal className="benefit benefit--lead">
            <div className="benefit__number">01 / TRANSPARENCY</div>
            <ReceiptIndianRupee size={28} />
            <h3>See where the package goes.</h3>
            <p>Meta spend, GST, service, and creative stay separate, visible, and understandable.</p>
            <div className="allocation-spark" aria-label="Example package allocation">
              <span style={{ width: '58.4%' }} /><span style={{ width: '10.5%' }} /><span style={{ width: '24.1%' }} /><span style={{ width: '7%' }} />
            </div>
            <div className="allocation-key"><span>Meta</span><span>GST</span><span>Service</span><span>Creative</span></div>
          </ScrollReveal>
          <ScrollReveal className="benefit benefit--signal">
            <div className="benefit__number">02 / PERFORMANCE</div>
            <ArrowUpRight size={25} />
            <strong>175–400</strong>
            <h3>Estimated enquiries</h3>
            <p>Restaurant and café example at ₹600/day.</p>
            <small>Planning estimate, not guaranteed</small>
          </ScrollReveal>
          <ScrollReveal className="benefit benefit--access">
            <div className="benefit__number">03 / ACCESS</div>
            <Clock3 size={24} />
            <div className="availability"><span /> REPORTING READY</div>
            <h3>Your numbers do not keep office hours.</h3>
            <p>Check the signal whenever your next decision needs it.</p>
          </ScrollReveal>
          <ScrollReveal className="benefit benefit--outcomes">
            <div className="benefit__number">04 / OUTCOMES</div>
            <div className="outcome-icons"><Eye size={19} /><MessageCircleMore size={19} /></div>
            <h3>From reach to real conversations.</h3>
            <p>Follow spend, reach, clicks, messages, leads, and the cost of each meaningful result.</p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
