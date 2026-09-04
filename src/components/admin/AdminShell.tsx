import {
  BadgeIndianRupee,
  Command,
  ExternalLink,
  Gauge,
  RadioTower,
  ReceiptIndianRupee,
  LogOut,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/context'
import { Brand } from '../ui/Brand'

const navigation = [
  { to: '/admin', label: 'Overview', icon: Gauge, end: true },
  { to: '/admin/clients', label: 'Clients', icon: UsersRound, end: false },
  { to: '/admin/offers', label: 'Offers', icon: BadgeIndianRupee, end: false },
  { to: '/admin/billing', label: 'Billing', icon: ReceiptIndianRupee, end: false },
  { to: '/admin/meta', label: 'Meta sync', icon: RadioTower, end: false },
]

export function AdminShell() {
  const { user, profile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link className="admin-sidebar__brand" to="/" aria-label="ADS MANAGER home"><Brand /></Link>
        <div className="admin-sidebar__mode"><Command size={14} /> HIY COMMAND LAYER</div>
        <nav className="admin-nav" aria-label="Admin workspace">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <div className="admin-identity">
            <span><ShieldCheck size={14} /></span>
            <div>
              <strong>{profile?.display_name || 'HIY Administrator'}</strong>
              <small>{user?.email || profile?.email || 'Secure admin'}</small>
            </div>
          </div>
          <button type="button" onClick={() => void handleSignOut()} disabled={signingOut}>
            <LogOut size={15} /> {signingOut ? 'Signing out' : 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="admin-stage">
        <header className="admin-topbar">
          <div>
            <span className="admin-live-dot" />
            <span>ADMIN CONTROL · SECURE SESSION</span>
          </div>
          <Link to="/" target="_blank">Public website <ExternalLink size={14} /></Link>
        </header>
        <main className="admin-content"><Outlet /></main>
      </div>
    </div>
  )
}
