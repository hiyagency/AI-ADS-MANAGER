import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../ui/Brand'

const links = [['Features', 'features'], ['Transparency', 'transparency'], ['Pricing', 'offers'], ['How It Works', 'how-it-works']]

export function Navbar() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])
  return (
    <header className="navbar">
      <div className="container-shell navbar__inner">
        <Link to="/" aria-label="ADS MANAGER home"><Brand /></Link>
        <nav className="navbar__desktop" aria-label="Main navigation">
          {links.map(([label, id]) => <a href={`#${id}`} key={id}>{label}</a>)}
          <Link className="nav-login" to="/login">CLIENT LOGIN <span aria-hidden>↗</span></Link>
        </nav>
        <button className="nav-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label="Toggle navigation">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <nav id="mobile-navigation" className={`navbar__mobile ${open ? 'is-open' : ''}`} aria-label="Mobile navigation" aria-hidden={!open}>
        <div className="container-shell">
          {links.map(([label, id]) => <a href={`#${id}`} onClick={() => setOpen(false)} key={id}>{label}<span aria-hidden>↘</span></a>)}
          <Link to="/login" onClick={() => setOpen(false)}>CLIENT LOGIN <span aria-hidden>↗</span></Link>
        </div>
      </nav>
    </header>
  )
}
