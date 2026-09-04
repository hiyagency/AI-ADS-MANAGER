import { type ReactNode, useEffect, useRef } from 'react'

let revealObserver: IntersectionObserver | null = null
function getObserver() {
  if (!revealObserver && typeof window !== 'undefined') {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          revealObserver?.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -32px' })
  }
  return revealObserver
}

export function ScrollReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.classList.add('is-visible')
      return
    }
    getObserver()?.observe(element)
    return () => revealObserver?.unobserve(element)
  }, [])
  return <div ref={ref} className={`scroll-reveal ${className}`}>{children}</div>
}
