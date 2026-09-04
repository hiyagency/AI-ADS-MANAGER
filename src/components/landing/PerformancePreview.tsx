import { ArrowUpRight, MessageCircleMore } from 'lucide-react'
import { useState } from 'react'
import { ScrollReveal } from '../ui/ScrollReveal'
import { SectionHeading } from '../ui/SectionHeading'

const periods = ['7D', '14D', '28D', 'THIS MONTH', 'LIFETIME'] as const
type Period = (typeof periods)[number]
const performance: Record<Period, { values: string[]; points: number[] }> = {
  '7D': { values: ['34','₹14.70','8.4K','11.8K','372','3.15%','₹1.34','₹42.20'], points: [18,26,22,41,37,52,61,55,78,84] },
  '14D': { values: ['71','₹14.55','17.9K','25.6K','801','3.13%','₹1.29','₹40.40'], points: [22,18,34,39,47,42,62,71,68,88] },
  '28D': { values: ['128','₹14.40','32.8K','47.2K','1,492','3.15%','₹1.24','₹39.05'], points: [12,25,21,43,52,48,66,62,79,94] },
  'THIS MONTH': { values: ['128','₹14.40','32.8K','47.2K','1,492','3.15%','₹1.24','₹39.05'], points: [12,25,21,43,52,48,66,62,79,94] },
  'LIFETIME': { values: ['386','₹13.92','104K','158K','5,184','3.28%','₹1.04','₹34.10'], points: [8,18,34,29,48,59,54,73,81,96] },
}
const labels = ['Messaging conversations','Cost / conversation','Reach','Impressions','Clicks','CTR','CPC','CPM']
const pathFor = (points: number[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${index * (600 / (points.length - 1))} ${165 - point * 1.35}`).join(' ')

export function PerformancePreview() {
  const [period, setPeriod] = useState<Period>('THIS MONTH')
  const current = performance[period]
  const line = pathFor(current.points)
  return (
    <section className="section performance">
      <div className="container-shell">
        <ScrollReveal><SectionHeading eyebrow="REPORTING WITHOUT THE MAZE" title="A campaign readout you can understand in seconds." copy="Switch the reporting window and watch the full signal update together. These values are clearly marked demo performance until live Meta synchronization is added." /></ScrollReveal>
        <ScrollReveal className="performance-console">
          <div className="performance-console__head">
            <div><span className="demo-pulse" /><strong>DEMO PERFORMANCE</strong></div>
            <div className="period-tabs" role="tablist" aria-label="Performance period">
              {periods.map((item) => <button role="tab" aria-selected={period === item} className={period === item ? 'is-active' : ''} key={item} onClick={() => setPeriod(item)}>{item}</button>)}
            </div>
          </div>
          <div className="performance-console__body">
            <div className="performance-chart">
              <div className="performance-chart__caption"><div><MessageCircleMore size={17} /><span>Conversation momentum</span></div><strong><ArrowUpRight size={15} /> 18.6%</strong></div>
              <svg viewBox="0 0 600 180" role="img" aria-label={`${period} illustrative conversation trend`}>
                <defs><linearGradient id="performance-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1688ff" stopOpacity=".36"/><stop offset="1" stopColor="#1688ff" stopOpacity="0"/></linearGradient></defs>
                <path className="performance-grid" d="M0 30H600M0 75H600M0 120H600M0 165H600" />
                <path key={`area-${period}`} className="performance-area" d={`${line} L600 180 L0 180Z`} />
                <path key={period} className="performance-line" d={line} />
              </svg>
              <div className="performance-chart__axis"><span>START</span><span>{period}</span><span>NOW</span></div>
            </div>
            <div className="performance-metrics" aria-live="polite">
              {labels.map((label, index) => <div key={label}><span>{label}</span><strong key={`${period}-${label}`}>{current.values[index]}</strong></div>)}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
