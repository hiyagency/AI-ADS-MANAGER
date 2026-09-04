import {
  Activity,
  BadgeCheck,
  Check,
  CircleAlert,
  Clock3,
  Link2,
  Plus,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Unplug,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  checkMetaTokenHealth,
  disconnectMetaAccount,
  discoverMetaAccounts,
  requestMetaSync,
  saveMetaAccount,
  type AvailableMetaAccount,
  type MetaTokenHealth,
} from '../../admin/data'
import { useAdminWorkspace } from '../../admin/useAdminWorkspace'
import { AdminState } from '../../components/admin/AdminState'
import type { ClientSummary, MetaAccount } from '../../types/database'

function MetaAccountEditor({ clients, account, onClose, onSaved }: {
  clients: ClientSummary[]
  account: MetaAccount | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState({
    clientId: account?.client_id ?? clients[0]?.id ?? '',
    externalAccountId: account?.external_account_id ?? '',
    name: account?.name ?? '',
    timezoneName: account?.timezone_name ?? 'Asia/Kolkata',
  })
  const [available, setAvailable] = useState<AvailableMetaAccount[]>([])
  const [discovering, setDiscovering] = useState(!account)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const discover = useCallback(async () => {
    setDiscovering(true)
    setDiscoveryError(null)
    try {
      const result = await discoverMetaAccounts()
      setAvailable(result.accounts)
      if (!result.accounts.length) setDiscoveryError('The configured Meta user cannot see any advertising accounts.')
    } catch (nextError) {
      setDiscoveryError(nextError instanceof Error ? nextError.message : 'Accessible Meta accounts could not be loaded.')
    } finally {
      setDiscovering(false)
    }
  }, [])

  useEffect(() => {
    if (account) return
    let active = true
    discoverMetaAccounts()
      .then((result) => {
        if (!active) return
        setAvailable(result.accounts)
        if (!result.accounts.length) setDiscoveryError('The configured Meta user cannot see any advertising accounts.')
      })
      .catch((nextError: unknown) => {
        if (active) setDiscoveryError(nextError instanceof Error ? nextError.message : 'Accessible Meta accounts could not be loaded.')
      })
      .finally(() => {
        if (active) setDiscovering(false)
      })
    return () => { active = false }
  }, [account])

  const chooseAccount = (choice: AvailableMetaAccount) => {
    setForm((current) => ({
      ...current,
      externalAccountId: choice.accountId,
      name: choice.name,
      timezoneName: choice.timezoneName,
    }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const result = await saveMetaAccount({ id: account?.id, ...form }) as { message?: string }
      onSaved(result.message ?? `${form.name} was verified and connected.`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The Meta account could not be saved.')
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="admin-dialog admin-dialog--meta" onCancel={onClose} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)}>
        <header>
          <div><span>{account ? 'VERIFY META MAPPING' : 'ACCOUNT DISCOVERY'}</span><h2>{account?.name ?? 'Connect an ad account'}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close Meta account editor"><X size={18} /></button>
        </header>

        {!account && (
          <section className="meta-discovery">
            <div className="meta-discovery__head">
              <div><Search size={15} /><span><strong>Accounts visible to HIY</strong><small>Retrieved server-side with the configured agency credential.</small></span></div>
              <button type="button" onClick={() => void discover()} disabled={discovering}><RefreshCw className={discovering ? 'spin' : ''} size={14} />{discovering ? 'Checking' : 'Check again'}</button>
            </div>
            {available.length > 0 && (
              <div className="meta-discovery__list" role="radiogroup" aria-label="Accessible Meta ad accounts">
                {available.map((choice) => {
                  const selected = choice.accountId === form.externalAccountId
                  return (
                    <button type="button" role="radio" aria-checked={selected} className={selected ? 'is-selected' : ''} key={choice.accountId} onClick={() => chooseAccount(choice)}>
                      <span>{selected ? <Check size={14} /> : <RadioTower size={14} />}</span>
                      <div><strong>{choice.name}</strong><small>act_{choice.accountId}{choice.businessName ? ` · ${choice.businessName}` : ''}</small></div>
                      <i>{choice.currencyCode}</i>
                    </button>
                  )
                })}
              </div>
            )}
            {discoveryError && <p className="meta-discovery__error"><CircleAlert size={14} />{discoveryError}</p>}
          </section>
        )}

        <div className="admin-form-grid">
          <label className="admin-field admin-field--wide">Client<select required value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label className="admin-field">Meta ad account ID<input required inputMode="numeric" pattern="[0-9]+" value={form.externalAccountId} onChange={(event) => setForm((current) => ({ ...current, externalAccountId: event.target.value.replace(/\D/g, '') }))} placeholder="Numeric ID without act_" /></label>
          <label className="admin-field">Display name<input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Client ad account" /></label>
          <label className="admin-field admin-field--wide">Fallback timezone<input required value={form.timezoneName} onChange={(event) => setForm((current) => ({ ...current, timezoneName: event.target.value }))} /></label>
        </div>
        <p className="admin-security-note"><ShieldCheck size={15} />Saving performs a live server-side identity check. The account name, currency, timezone, and status are taken from Meta when available.</p>
        {error && <p className="admin-form-error" role="alert"><CircleAlert size={15} />{error}</p>}
        <footer><button type="button" className="admin-button admin-button--ghost" onClick={onClose}>Cancel</button><button type="submit" className="admin-button" disabled={saving || !form.clientId || !form.externalAccountId}>{saving ? 'Verifying…' : 'Verify & connect'}</button></footer>
      </form>
    </dialog>
  )
}

function freshnessLabel(value: string | null, now: number) {
  if (!value) return 'Never synchronized'
  const date = new Date(value)
  const minutes = Math.max(0, Math.round((now - date.getTime()) / 60_000))
  if (minutes < 2) return 'Synchronized just now'
  if (minutes < 60) return `Synchronized ${minutes} min ago`
  if (minutes < 1440) return `Synchronized ${Math.round(minutes / 60)} hr ago`
  return `Synchronized ${Math.round(minutes / 1440)} days ago`
}

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not checked'
}

export function AdminMetaPage() {
  const { data, loading, error, reload } = useAdminWorkspace()
  const [editing, setEditing] = useState<MetaAccount | 'new' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [tokenHealth, setTokenHealth] = useState<MetaTokenHealth | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [renderTime] = useState(() => Date.now())
  if (!data) return <AdminState loading={loading} error={error} onRetry={() => void reload()} />

  const sync = async (account: MetaAccount) => {
    setBusy(account.id)
    setNotice(null)
    setActionError(null)
    try {
      await requestMetaSync(account.id)
      await reload()
      setNotice(`${account.name} synchronization was queued.`)
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'The synchronization could not be queued.')
    } finally {
      setBusy(null)
    }
  }

  const checkToken = async () => {
    setBusy('token')
    setNotice(null)
    setActionError(null)
    try {
      const result = await checkMetaTokenHealth()
      setTokenHealth(result.health)
      await reload()
      setNotice(result.health.missingRequiredScopes.length
        ? `Credential check completed. Missing: ${result.health.missingRequiredScopes.join(', ')}.`
        : `Credential check completed with ${result.health.status} status.`)
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Meta credential health could not be checked.')
    } finally {
      setBusy(null)
    }
  }

  const disconnect = async (account: MetaAccount) => {
    if (disconnecting !== account.id) {
      setDisconnecting(account.id)
      return
    }
    setBusy(account.id)
    setActionError(null)
    try {
      const result = await disconnectMetaAccount(account.id)
      setDisconnecting(null)
      await reload()
      setNotice(result.message)
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'The mapping could not be disconnected.')
    } finally {
      setBusy(null)
    }
  }

  const saved = async (message: string) => {
    setEditing(null)
    await reload()
    setNotice(message)
  }

  const connectedAccounts = data.metaAccounts.filter((account) => account.active)
  const attentionCount = connectedAccounts.filter((account) => account.connection_status === 'attention' || account.token_status === 'expired' || account.token_status === 'revoked').length

  return (
    <div className="admin-page">
      <header className="admin-page-head admin-page-head--actions">
        <div><p className="eyebrow"><span />META CONTROL PLANE</p><h1>Ad account connections</h1><p>Discover authorized accounts, verify their identity, monitor credential health, and dispatch isolated reporting syncs.</p></div>
        <div className="admin-page-head__buttons">
          <button className="admin-button admin-button--ghost" type="button" onClick={() => void checkToken()} disabled={busy === 'token'}><Activity size={16} />{busy === 'token' ? 'Checking…' : 'Check credential'}</button>
          <button className="admin-button" type="button" disabled={!data.clients.length} onClick={() => setEditing('new')}><Plus size={16} /> Connect account</button>
        </div>
      </header>

      <section className="meta-health-strip" aria-label="Meta connection summary">
        <div><span>ACTIVE MAPPINGS</span><strong>{connectedAccounts.length}</strong><small>Tenant-linked ad accounts</small></div>
        <div><span>NEEDS ATTENTION</span><strong>{attentionCount}</strong><small>Credential or account health</small></div>
        <div><span>ATTRIBUTION</span><strong>7D + 1D</strong><small>Click and view defaults</small></div>
        <div><span>TOKEN CHECK</span><strong>{tokenHealth?.status ?? 'Not run'}</strong><small>{tokenHealth?.expiresAt ? `Expires ${new Date(tokenHealth.expiresAt).toLocaleDateString('en-IN')}` : 'Server diagnostic only'}</small></div>
      </section>

      {(notice || actionError) && <p className={`admin-notice ${actionError ? 'admin-notice--error' : ''}`} role={actionError ? 'alert' : 'status'}>{actionError ? <CircleAlert size={15} /> : <BadgeCheck size={15} />}{actionError || notice}</p>}

      <section className="meta-account-grid" aria-label="Meta ad accounts">
        {connectedAccounts.map((account) => {
          const client = data.clients.find((item) => item.id === account.client_id)
          const campaigns = data.campaigns.filter((campaign) => campaign.meta_account_id === account.id)
          const latestLog = data.syncLogs.find((log) => log.meta_account_id === account.id)
          const isFresh = account.last_success_at && renderTime - new Date(account.last_success_at).getTime() < 8 * 60 * 60 * 1000
          return (
            <article className="meta-account-card" key={account.id}>
              <header>
                <div><span><RadioTower size={15} />{client?.name ?? 'Unknown client'}</span><h2>{account.name}</h2><small>act_{account.external_account_id} · {account.currency_code} · {account.timezone_name}</small></div>
                <span className={`status-pill status-pill--${account.connection_status === 'connected' ? 'active' : 'disabled'}`}>{account.connection_status}</span>
              </header>
              <div className="meta-account-signal"><i className={isFresh ? 'is-fresh' : ''} /><div><strong>{freshnessLabel(account.last_success_at, renderTime)}</strong><span>Token {account.token_status} · {campaigns.length} campaigns</span></div></div>
              <dl className="meta-account-facts">
                <div><dt>Business</dt><dd>{account.business_name ?? 'Not returned'}</dd></div>
                <div><dt>Meta status</dt><dd>{account.remote_account_status ?? 'Unknown'}</dd></div>
                <div><dt>Verified</dt><dd>{dateLabel(account.last_verified_at)}</dd></div>
              </dl>
              {latestLog && <div className="meta-latest-log"><Clock3 size={14} /><span><strong>{latestLog.status}</strong>{latestLog.message ?? `${latestLog.records_synced} records processed`}<small>{latestLog.pages_fetched} pages · {latestLog.rate_limit_retries} retries</small></span></div>}
              {account.last_error_summary && <p className="meta-account-error"><CircleAlert size={14} />{account.last_error_summary}</p>}
              <footer>
                <button type="button" onClick={() => setEditing(account)}><Link2 size={14} />Verify</button>
                <button type="button" disabled={busy === account.id || !account.active} onClick={() => void sync(account)}><RefreshCw size={14} className={busy === account.id ? 'spin' : ''} />{busy === account.id ? 'Queueing' : 'Sync now'}</button>
                <button type="button" className={disconnecting === account.id ? 'is-danger' : ''} onBlur={() => setDisconnecting(null)} onClick={() => void disconnect(account)}><Unplug size={14} />{disconnecting === account.id ? 'Confirm' : 'Disconnect'}</button>
              </footer>
            </article>
          )
        })}
      </section>

      {!connectedAccounts.length && <div className="admin-list-empty"><RadioTower /><strong>No Meta account mappings</strong><p>The integration is prepared locally. Account discovery becomes operational after server credentials are added during the later activation phase.</p></div>}
      <section className="admin-policy-note"><ShieldCheck size={18} /><div><strong>Read-only, server-only connection</strong><p>Meta Graph requests are performed only by protected Netlify functions. Browser sessions receive sanitized account metadata and reporting values, never credentials.</p><small>Missing permissions, token expiry, account restrictions, rate limiting, and partial data fail closed into visible health states.</small></div></section>
      {editing && <MetaAccountEditor clients={data.clients} account={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(message) => void saved(message)} />}
    </div>
  )
}
