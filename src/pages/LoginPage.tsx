import { ArrowLeft, CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { messageForDeniedAccess, safeDestinationForRole } from '../auth/access'
import { Brand } from '../components/ui/Brand'
import { Button } from '../components/ui/Button'

function LoginStatusPanel({
  icon,
  eyebrow,
  title,
  copy,
  actions,
  busy = false,
}: {
  icon: ReactNode
  eyebrow: string
  title: string
  copy: string
  actions?: ReactNode
  busy?: boolean
}) {
  return (
    <div className="login-form-wrap login-status-panel" aria-live="polite" aria-busy={busy}>
      <div className="login-icon">{icon}</div>
      <p className="micro-label">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="login-intro">{copy}</p>
      {actions && <div className="login-status-actions">{actions}</div>}
      <p className="login-support">Client access is provided by HIY AGENCY.</p>
      <Link to="/" className="login-back"><ArrowLeft size={15} /> Back to website</Link>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, profile, deniedReason, error: accessError, signIn, signOut, retryAccess } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const state = location.state as { from?: unknown } | null
  const requestedPath = typeof state?.from === 'string' ? state.from : undefined

  useEffect(() => {
    if (status === 'authenticated' && profile) {
      navigate(safeDestinationForRole(profile.role, requestedPath), { replace: true })
    }
  }, [navigate, profile, requestedPath, status])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    if (result.error) setFormError(result.error)
    setSubmitting(false)
  }

  const handleSignOut = async () => {
    setActionError(null)
    const result = await signOut()
    if (result.error) setActionError(result.error)
  }

  let content: ReactNode

  if (status === 'loading' || status === 'resolving' || status === 'authenticated') {
    content = (
      <LoginStatusPanel
        busy
        icon={<LoaderCircle className="spin" size={21} />}
        eyebrow="SECURE SESSION"
        title={status === 'authenticated' ? 'Opening your workspace' : 'Checking your access'}
        copy="We are securely connecting you to the correct HIY workspace."
      />
    )
  } else if (status === 'misconfigured') {
    content = (
      <LoginStatusPanel
        icon={<CircleAlert size={21} />}
        eyebrow="PORTAL UNAVAILABLE"
        title="Client access is not connected here"
        copy="This environment is missing its secure Supabase connection. Please contact HIY AGENCY for assistance."
      />
    )
  } else if (status === 'denied') {
    content = (
      <LoginStatusPanel
        icon={<ShieldX size={21} />}
        eyebrow="ACCESS UNAVAILABLE"
        title="This workspace cannot be opened"
        copy={messageForDeniedAccess(deniedReason)}
        actions={
          <>
            {actionError && <p className="login-notice login-notice--error" role="alert"><CircleAlert size={16} />{actionError}</p>}
            <Button type="button" variant="secondary" onClick={() => void handleSignOut()}>SIGN OUT</Button>
          </>
        }
      />
    )
  } else if (status === 'error') {
    content = (
      <LoginStatusPanel
        icon={<CircleAlert size={21} />}
        eyebrow="CONNECTION INTERRUPTED"
        title="We could not verify your access"
        copy={accessError ?? 'Your account has not been changed. Retry the secure connection or sign out.'}
        actions={
          <>
            {actionError && <p className="login-notice login-notice--error" role="alert"><CircleAlert size={16} />{actionError}</p>}
            <Button type="button" onClick={() => void retryAccess()}><RefreshCw size={16} /> RETRY ACCESS</Button>
            <Button type="button" variant="secondary" onClick={() => void handleSignOut()}>SIGN OUT</Button>
          </>
        }
      />
    )
  } else {
    content = (
      <div className="login-form-wrap">
        <div className="login-icon"><LockKeyhole size={21} /></div>
        <p className="micro-label">CLIENT ACCESS</p>
        <h1>Welcome Back</h1>
        <p className="login-intro">Access your advertising dashboard.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="login-email">
            Email
            <input
              id="login-email"
              name="email"
              required
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@company.com"
              value={email}
              disabled={submitting}
              aria-invalid={Boolean(formError)}
              aria-describedby={formError ? 'login-error' : undefined}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label htmlFor="login-password">
            Password
            <span className="password-field">
              <input
                id="login-password"
                name="password"
                required
                type={visible ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                disabled={submitting}
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'login-error' : undefined}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide password' : 'Show password'}>
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <Button type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}
            {submitting ? 'VERIFYING ACCESS' : 'LOGIN TO ADS MANAGER'}
          </Button>
          {formError && <p id="login-error" className="login-notice login-notice--error" role="alert"><CircleAlert size={16} />{formError}</p>}
        </form>
        <p className="login-support">Client access is provided by HIY AGENCY.</p>
        <Link to="/" className="login-back"><ArrowLeft size={15} /> Back to website</Link>
      </div>
    )
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual__grid" aria-hidden />
        <Link to="/" aria-label="ADS MANAGER home"><Brand /></Link>
        <div className="login-visual__center">
          <img src="/hiy-agency-logo.jpg" alt="HIY Agency" />
          <p className="eyebrow"><span />CLIENT REPORTING, REFINED</p>
          <h2>Every rupee.<br />Every signal.</h2>
          <p>A clearer view of advertising investment and performance, built for HIY AGENCY clients.</p>
        </div>
        <div className="login-visual__status"><span /> SECURE PORTAL · HIY AGENCY</div>
      </section>
      <section className="login-form-side">
        <div className="login-mobile-head"><Brand /><Link to="/" aria-label="Back to home"><ArrowLeft size={18} /></Link></div>
        {content}
      </section>
    </main>
  )
}
