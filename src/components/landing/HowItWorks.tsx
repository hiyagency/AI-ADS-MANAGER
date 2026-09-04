import { BarChart3, LogIn, Megaphone, MousePointerClick } from 'lucide-react'
import { ScrollReveal } from '../ui/ScrollReveal'
import { SectionHeading } from '../ui/SectionHeading'

const steps = [
  { icon: MousePointerClick, title: 'Choose the plan', copy: 'Select your niche and the exact Meta budget tier.' },
  { icon: Megaphone, title: 'HIY launches', copy: 'Strategy, setup, creative, and campaign management move together.' },
  { icon: BarChart3, title: 'The signal updates', copy: 'ADS MANAGER organizes performance into a clear client view.' },
  { icon: LogIn, title: 'You check in', copy: 'Open the portal whenever you need the next decision.' },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section process">
      <div className="container-shell">
        <ScrollReveal><SectionHeading eyebrow="FROM CHOICE TO SIGNAL" title="Four steps. One connected campaign system." /></ScrollReveal>
        <div className="process-line">
          {steps.map(({ icon: Icon, title, copy }, index) => (
            <ScrollReveal className="process-step" key={title}>
              <div className="process-step__top"><span>0{index + 1}</span><Icon size={20} /></div>
              <div className="process-step__node"><i /></div>
              <h3>{title}</h3><p>{copy}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
