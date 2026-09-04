import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/ui/Brand'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <main className="not-found">
      <div className="not-found__grid" aria-hidden />
      <header className="container-shell"><Link to="/" aria-label="ADS MANAGER home"><Brand /></Link></header>
      <div className="container-shell not-found__content">
        <div className="error-orbit" aria-hidden><span>4</span><i /><span>4</span></div>
        <p className="eyebrow"><span />SIGNAL NOT FOUND</p>
        <h1>This report is off the map.</h1>
        <p>The page may have moved, or the address might be incorrect.</p>
        <Button to="/"><ArrowLeft size={16} /> BACK TO HOME</Button>
      </div>
      <img className="not-found__logo" src="/hiy-agency-logo.jpg" alt="HIY Agency" />
    </main>
  )
}
