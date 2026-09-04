import {
  BadgeCheck,
  Building2,
  ChevronDown,
  CircleAlert,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldOff,
  UserPlus,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  attachClientUser,
  detachClientUser,
  inviteClientUser,
  saveClient,
  setClientStatus,
  setProfileStatus,
  slugifyClientName,
  type ClientInput,
} from '../../admin/data'
import { useAdminWorkspace } from '../../admin/useAdminWorkspace'
import { AdminState } from '../../components/admin/AdminState'
import type { ClientSummary, EntityStatus, Profile } from '../../types/database'

const emptyClient: ClientInput = {
  name: '',
  slug: '',
  status: 'active',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
}

function ClientEditor({ client, onClose, onSaved }: {
  client: ClientSummary | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState<ClientInput>(() => client ? {
    name: client.name,
    slug: client.slug,
    status: client.status,
    contact_name: client.contact_name ?? '',
    contact_email: client.contact_email ?? '',
    contact_phone: client.contact_phone ?? '',
  } : emptyClient)
  const [slugTouched, setSlugTouched] = useState(Boolean(client))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const update = (field: keyof ClientInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleName = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugifyClientName(value),
    }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await saveClient(form, client?.id)
      onSaved(client ? `${form.name} was updated.` : `${form.name} was created.`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The client could not be saved.')
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="admin-dialog" onCancel={onClose} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)}>
        <header>
          <div><span>{client ? 'EDIT CLIENT' : 'NEW CLIENT'}</span><h2>{client ? client.name : 'Create a workspace'}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close client editor"><X size={18} /></button>
        </header>
        <div className="admin-form-grid">
          <label className="admin-field admin-field--wide">Business name<input required autoFocus value={form.name} onChange={(event) => handleName(event.target.value)} placeholder="e.g. Hummingbird Café" /></label>
          <label className="admin-field">Workspace slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => { setSlugTouched(true); update('slug', slugifyClientName(event.target.value)) }} placeholder="hummingbird-cafe" /></label>
          <label className="admin-field">Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="active">Active</option><option value="disabled">Disabled</option></select><ChevronDown size={15} /></label>
          <label className="admin-field">Contact name<input value={form.contact_name} onChange={(event) => update('contact_name', event.target.value)} placeholder="Primary point of contact" /></label>
          <label className="admin-field">Contact email<input type="email" value={form.contact_email} onChange={(event) => update('contact_email', event.target.value)} placeholder="client@business.com" /></label>
          <label className="admin-field">Contact phone<input value={form.contact_phone} onChange={(event) => update('contact_phone', event.target.value)} placeholder="+91 00000 00000" /></label>
        </div>
        {error && <p className="admin-form-error" role="alert"><CircleAlert size={15} />{error}</p>}
        <footer><button type="button" className="admin-button admin-button--ghost" onClick={onClose}>Cancel</button><button type="submit" className="admin-button" disabled={saving}>{saving ? 'Saving…' : client ? 'Save changes' : 'Create client'}</button></footer>
      </form>
    </dialog>
  )
}

function LoginIdentity({ profile }: { profile: Profile }) {
  return (
    <div className="admin-login-identity">
      <span><KeyRound size={15} /></span>
      <div><strong>{profile.display_name || profile.email || 'Pending client login'}</strong><small>{profile.email || profile.id}</small></div>
      <i className={`status-pill status-pill--${profile.status}`}>{profile.status}</i>
    </div>
  )
}

export function AdminClientsPage() {
  const { data, loading, error, reload } = useAdminWorkspace()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | EntityStatus>('all')
  const [editing, setEditing] = useState<ClientSummary | null | 'new'>(null)
  const [accessClientId, setAccessClientId] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const clients = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    return data.clients.filter((client) => {
      const matchesStatus = status === 'all' || client.status === status
      const haystack = `${client.name} ${client.contact_name ?? ''} ${client.contact_email ?? ''}`.toLowerCase()
      return matchesStatus && (!needle || haystack.includes(needle))
    })
  }, [data, query, status])

  if (!data) return <AdminState loading={loading} error={error} onRetry={() => void reload()} />

  const offerName = (offerId: string | null) => data.offers.find((offer) => offer.id === offerId)?.name
  const assignedUserIds = new Set(data.memberships.map((item) => item.user_id))
  const accessClient = data.clients.find((client) => client.id === accessClientId)
  const accessProfiles = data.memberships
    .filter((item) => item.client_id === accessClientId)
    .map((item) => data.profiles.find((profile) => profile.id === item.user_id))
    .filter((profile): profile is Profile => Boolean(profile))
  const availableProfiles = data.profiles.filter((profile) => !assignedUserIds.has(profile.id))

  const mutate = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key)
    setActionError(null)
    setNotice(null)
    try {
      await action()
      await reload()
      setNotice(success)
      setSelectedProfile('')
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'The action could not be completed.')
    } finally {
      setBusy(null)
    }
  }

  const invite = async (event: FormEvent, clientId: string) => {
    event.preventDefault()
    setBusy('invite')
    setActionError(null)
    setNotice(null)
    try {
      await inviteClientUser(clientId, inviteEmail, inviteName)
      await reload()
      setInviteEmail('')
      setInviteName('')
      setNotice(`Invitation sent to ${inviteEmail}. The login is attached and active.`)
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'The invitation could not be sent.')
    } finally {
      setBusy(null)
    }
  }

  const saved = async (message: string) => {
    setEditing(null)
    await reload()
    setNotice(message)
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head admin-page-head--actions">
        <div><p className="eyebrow"><span />CLIENT OPERATIONS</p><h1>Client workspaces</h1><p>Create the account record, assign its package, and control portal access.</p></div>
        <button className="admin-button" type="button" onClick={() => setEditing('new')}><Plus size={16} /> New client</button>
      </header>

      <div className="admin-toolbar">
        <label className="admin-search"><Search size={16} /><span className="sr-only">Search clients</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search business or contact" /></label>
        <div className="admin-filter" aria-label="Filter client status">
          {(['all', 'active', 'disabled'] as const).map((value) => <button type="button" key={value} className={status === value ? 'is-active' : ''} aria-pressed={status === value} onClick={() => setStatus(value)}>{value}</button>)}
        </div>
      </div>

      {(notice || actionError) && <p className={`admin-notice ${actionError ? 'admin-notice--error' : ''}`} role={actionError ? 'alert' : 'status'}>{actionError ? <CircleAlert size={15} /> : <BadgeCheck size={15} />}{actionError || notice}</p>}

      <section className="admin-client-list" aria-label="Clients">
        <div className="admin-client-list__head"><span>CLIENT</span><span>PACKAGE</span><span>CONTACT</span><span>STATUS</span><span>ACTIONS</span></div>
        {clients.map((client) => (
          <article key={client.id} className={accessClientId === client.id ? 'is-expanded' : ''}>
            <div className="admin-client-row">
              <div className="admin-client-name"><span><Building2 size={17} /></span><div><strong>{client.name}</strong><small>/{client.slug}</small></div></div>
              <div className="admin-client-package"><strong>{offerName(client.offer_id) ?? 'Unassigned'}</strong><small>{client.offer_id ? 'Current package' : 'Needs selection'}</small></div>
              <div className="admin-client-contact"><strong>{client.contact_name || 'No contact'}</strong><small>{client.contact_email || client.contact_phone || 'Add details'}</small></div>
              <div><span className={`status-pill status-pill--${client.status}`}>{client.status}</span></div>
              <div className="admin-row-actions">
                <button type="button" onClick={() => setEditing(client)}><Pencil size={14} /> Edit</button>
                <button type="button" aria-expanded={accessClientId === client.id} onClick={() => setAccessClientId((current) => current === client.id ? null : client.id)}><KeyRound size={14} /> Access</button>
                <button type="button" disabled={busy === `status-${client.id}`} onClick={() => void mutate(`status-${client.id}`, () => setClientStatus(client.id, client.status === 'active' ? 'disabled' : 'active'), `${client.name} is now ${client.status === 'active' ? 'disabled' : 'active'}.`)}>{client.status === 'active' ? <ShieldOff size={14} /> : <BadgeCheck size={14} />}{client.status === 'active' ? 'Disable' : 'Enable'}</button>
              </div>
            </div>
            {accessClientId === client.id && (
              <div className="admin-access-panel">
                <div className="admin-access-copy"><span>PORTAL ACCESS</span><h3>{accessClient?.name}</h3><p>Invite a new client login through the protected server or attach an existing Supabase Auth profile.</p></div>
                <div className="admin-access-list">
                  {accessProfiles.map((profile) => (
                    <div className="admin-access-item" key={profile.id}>
                      <LoginIdentity profile={profile} />
                      <div>
                        <button type="button" disabled={busy === `profile-${profile.id}`} onClick={() => void mutate(`profile-${profile.id}`, () => setProfileStatus(profile.id, profile.status === 'active' ? 'disabled' : 'active'), `Login ${profile.status === 'active' ? 'disabled' : 'enabled'}.`)}>{profile.status === 'active' ? 'Disable login' : 'Enable login'}</button>
                        <button type="button" disabled={busy === `detach-${profile.id}`} onClick={() => void mutate(`detach-${profile.id}`, () => detachClientUser(client.id, profile.id), 'Login detached from client.')}>Detach</button>
                      </div>
                    </div>
                  ))}
                  {!accessProfiles.length && <p className="admin-empty-copy">No portal login is attached to this client.</p>}
                  <form className="admin-access-add" onSubmit={(event) => { event.preventDefault(); if (selectedProfile) void mutate('attach', () => attachClientUser(client.id, selectedProfile), 'Login attached to client.') }}>
                    <label><span className="sr-only">Available client login</span><select value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)}><option value="">Select an unassigned Auth profile</option>{availableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.email || profile.display_name || profile.id}</option>)}</select><ChevronDown size={15} /></label>
                    <button type="submit" className="admin-button" disabled={!selectedProfile || busy === 'attach'}><UserPlus size={15} /> Attach login</button>
                  </form>
                  {!availableProfiles.length && <p className="admin-access-hint"><Mail size={14} /> No unassigned existing profiles.</p>}
                  <form className="admin-invite-form" onSubmit={(event) => void invite(event, client.id)}>
                    <div><span>INVITE A NEW CLIENT LOGIN</span><p>The server creates a fail-closed Auth user, attaches this workspace, then enables the profile.</p></div>
                    <label className="admin-field">Display name<input required value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Client contact" /></label>
                    <label className="admin-field">Email address<input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="client@business.com" /></label>
                    <button type="submit" className="admin-button" disabled={busy === 'invite'}><Mail size={15} />{busy === 'invite' ? 'Sending…' : 'Send secure invite'}</button>
                  </form>
                </div>
              </div>
            )}
          </article>
        ))}
        {!clients.length && <div className="admin-list-empty"><Building2 /><strong>No matching clients</strong><p>Adjust the filters or create a new client workspace.</p></div>}
      </section>

      {editing && <ClientEditor client={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(message) => void saved(message)} />}
    </div>
  )
}
