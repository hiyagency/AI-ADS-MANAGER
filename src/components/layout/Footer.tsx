import { Link } from 'react-router-dom'
import { Brand } from '../ui/Brand'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container-shell footer__grid">
        <div><Brand /><p>Performance advertising made transparent.</p></div>
        <div className="footer__signal"><span />CAMPAIGN SIGNAL: READY</div>
        <nav aria-label="Footer navigation"><Link to="/login">Client Login</Link><a href="https://hiy.agency" target="_blank" rel="noreferrer">HIY Agency</a></nav>
      </div>
      <div className="container-shell footer__base"><span>© {new Date().getFullYear()} HIY AGENCY</span><span>ADS MANAGER · PHASE 3</span></div>
    </footer>
  )
}
