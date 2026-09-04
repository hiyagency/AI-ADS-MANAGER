import { ArrowLeft, CircleAlert, LoaderCircle, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { messageForDeniedAccess, type AccessDeniedReason } from '../auth/access'
import { Brand } from '../components/ui/Brand'
import { Button } from '../components/ui/Button'

const ClientDashboardPage = lazy(async () => ({
  default: (await import('./ClientDashboardPage')).ClientDashboardPage,
}))

type PortalStateKind = 'loading' | 'misconfigured' | 'denied' | 'error'

const stateContent: Record<PortalStateKind, { eyebrow: string; title: string; copy: string }> = {
  loading: {
    eyebrow: 'SECURE SESSION',
    title: 'Checking your access',
    copy: 'We are securely connecting you to the correct HIY workspace.',
  },
  misconfigured: {
    eyebrow: 'PORTAL UNAVAILABLE',
    title: 'Client access is not connected here',
    copy: 'This environment is missing its secure Supabase connection. The public ADS MANAGER website is still available.',
  },
  denied: {
    eyebrow: 'ACCESS UNAVAILABLE',
    title: 'This workspace cannot be opened',
    copy: 'Contact HIY AGENCY if you believe your access should be active.',
  },
  error: {
    eyebrow: 'CONNECTION INTERRUPTED',
    title: 'We could not verify your access',
    copy: 'Your account has not been changed. Retry the secure connection or sign out.',
  },
}

export function PortalStatePage({
  kind,
  detail,
  deniedReason,
  onRetry,
  onSignOut,
}: {
  kind: PortalStateKind
  detail?: string | null
  deniedReason?: AccessDeniedReason | null
  onRetry?: () => void | Promise<void>
  onSignOut?: () => void | Promise<unknown>
}) {
  const content = stateContent[kind]
  const copy = kind === 'denied' ? messageForDeniedAccess(deniedReason ?? null) : detail || content.copy

  return (
    <main className="portal-state">
      <div className="portal-grid" aria-hidden />
      <header className="container-shell"><Link to="/" aria-label="ADS MANAGER home"><Brand /></Link></header>
      <section className="portal-state__card" aria-live="polite">
        <div className={`portal-state__icon portal-state__icon--${kind}`} aria-hidden>
          {kind === 'loading' ? <LoaderCircle className="spin" /> : kind === 'error' ? <CircleAlert /> : <ShieldCheck />}
        </div>
        <p className="eyebrow"><span />{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{copy}</p>
        <div className="portal-state__actions">
          {onRetry && <Button type="button" onClick={() => void onRetry()}><RefreshCw size={16} /> RETRY ACCESS</Button>}
          {onSignOut && <Button type="button" variant="secondary" onClick={() => void onSignOut()}><LogOut size={16} /> SIGN OUT</Button>}
          {!onRetry && !onSignOut && <Button to="/" variant="secondary"><ArrowLeft size={16} /> PUBLIC WEBSITE</Button>}
        </div>
      </section>
    </main>
  )
}

export function ClientPortalPage() {
  return (
    <Suspense fallback={<PortalStatePage kind="loading" />}>
      <ClientDashboardPage />
    </Suspense>
  )
}
