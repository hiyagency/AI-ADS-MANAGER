import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileClock,
  IndianRupee,
  Plus,
  ReceiptIndianRupee,
  RotateCcw,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import {
  assignClientOffer,
  formatInr,
  recordPayment,
  setClientOfferStatus,
  voidPayment,
  type AssignmentInput,
  type PaymentInput,
} from '../../admin/data'
import { useAdminWorkspace } from '../../admin/useAdminWorkspace'
import { AdminState } from '../../components/admin/AdminState'
import type { ClientOffer, ClientSummary, Offer, PaymentEntry, PaymentMethod } from '../../types/database'
import { calculateCommercialPricing } from '../../utils/commercialPricing'

const today = () => {
  const now = new Date()
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60_000))
  return local.toISOString().slice(0, 10)
}

function inputFromOffer(clientId: string, offer: Offer): AssignmentInput {
  return {
    clientId,
    sourceOfferId: offer.id,
    name: offer.name,
    description: offer.description,
    offerKind: offer.offer_kind,
    billingType: offer.billing_type,
    cycleDays: offer.cycle_days,
    dailyBudget: offer.daily_budget,
    serviceRate: offer.service_rate,
    gstRate: offer.gst_rate,
    creativeUnitPrice: offer.creative_unit_price,
    includedCreatives: offer.included_creatives,
    aiManagerFee: offer.ai_manager_month_one_fee,
    additionalCharges: offer.additional_charges,
    discount: 0,
    startsOn: today(),
    notes: '',
  }
}

function AssignmentEditor({ clients, offers, initialClientId, onClose, onSaved }: {
  clients: ClientSummary[]
  offers: Offer[]
  initialClientId: string
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const firstOffer = offers[0]
  const [form, setForm] = useState<AssignmentInput>(() => inputFromOffer(initialClientId || clients[0]?.id || '', firstOffer))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const pricing = useMemo(() => {
    try { return calculateCommercialPricing(form) } catch { return null }
  }, [form])

  const updateOffer = (offerId: string) => {
    const offer = offers.find((item) => item.id === offerId)
    if (offer) setForm((current) => ({ ...inputFromOffer(current.clientId, offer), startsOn: current.startsOn }))
  }
  const text = (field: keyof AssignmentInput, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const numeric = (field: keyof AssignmentInput, value: string) => setForm((current) => ({ ...current, [field]: Number(value), offerKind: 'custom' }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await assignClientOffer(form)
      onSaved(`${form.name} was assigned with a frozen ${formatInr(pricing?.total ?? 0, true)} total.`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The assignment could not be saved.')
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="admin-dialog admin-dialog--wide" onCancel={onClose} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)}>
        <header><div><span>NEW COMMERCIAL ASSIGNMENT</span><h2>Freeze the client package</h2></div><button type="button" onClick={onClose} aria-label="Close assignment editor"><X size={18} /></button></header>
        <div className="admin-offer-editor">
          <div className="admin-form-grid">
            <label className="admin-field">Client<select required value={form.clientId} onChange={(event) => text('clientId', event.target.value)}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><ChevronDown size={15} /></label>
            <label className="admin-field">Source package<select required value={form.sourceOfferId ?? ''} onChange={(event) => updateOffer(event.target.value)}>{offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name} · v{offer.version}</option>)}</select><ChevronDown size={15} /></label>
            <label className="admin-field admin-field--wide">Assignment name<input required value={form.name} onChange={(event) => text('name', event.target.value)} /></label>
            <label className="admin-field">Starts on<input required type="date" value={form.startsOn} onChange={(event) => text('startsOn', event.target.value)} /></label>
            <label className="admin-field">Billing<select value={form.billingType} onChange={(event) => text('billingType', event.target.value)}><option value="monthly">Monthly</option><option value="one_time">One-time</option></select><ChevronDown size={15} /></label>
            <label className="admin-field">Cycle days<input required type="number" min="1" max="366" value={form.cycleDays} onChange={(event) => numeric('cycleDays', event.target.value)} /></label>
            <label className="admin-field">Daily Meta budget<input required type="number" min="0" step="0.01" value={form.dailyBudget} onChange={(event) => numeric('dailyBudget', event.target.value)} /></label>
            <label className="admin-field">HIY service %<input required type="number" min="0" max="100" step="0.01" value={form.serviceRate} onChange={(event) => numeric('serviceRate', event.target.value)} /></label>
            <label className="admin-field">GST on media %<input required type="number" min="0" max="100" step="0.01" value={form.gstRate} onChange={(event) => numeric('gstRate', event.target.value)} /></label>
            <label className="admin-field">Creative unit price<input required type="number" min="0" step="0.01" value={form.creativeUnitPrice} onChange={(event) => numeric('creativeUnitPrice', event.target.value)} /></label>
            <label className="admin-field">Included creatives<input required type="number" min="0" step="1" value={form.includedCreatives} onChange={(event) => numeric('includedCreatives', event.target.value)} /></label>
            <label className="admin-field">AI Manager<input required type="number" min="0" step="0.01" value={form.aiManagerFee} onChange={(event) => numeric('aiManagerFee', event.target.value)} /></label>
            <label className="admin-field">Additional charges<input required type="number" min="0" step="0.01" value={form.additionalCharges} onChange={(event) => numeric('additionalCharges', event.target.value)} /></label>
            <label className="admin-field">Discount<input required type="number" min="0" step="0.01" value={form.discount} onChange={(event) => numeric('discount', event.target.value)} /></label>
            <label className="admin-field admin-field--wide">Commercial notes<textarea rows={3} maxLength={2000} value={form.notes} onChange={(event) => text('notes', event.target.value)} placeholder="Internal or client-visible agreement context." /></label>
          </div>
          <aside className="admin-price-preview" aria-live="polite">
            <span>FROZEN CLIENT TOTAL</span><strong>{pricing ? formatInr(pricing.total, true) : 'Check values'}</strong>
            {pricing && <>
              <div><span>Meta media</span><b>{formatInr(pricing.adBudget, true)}</b></div>
              <div><span>HIY service</span><b>{formatInr(pricing.serviceFee, true)}</b></div>
              <div><span>GST</span><b>{formatInr(pricing.gst, true)}</b></div>
              <div><span>Creative</span><b>{formatInr(pricing.creativeCharge, true)}</b></div>
              <div><span>AI + additional</span><b>{formatInr(pricing.aiManagerFee + pricing.additionalCharges, true)}</b></div>
              <div className="is-discount"><span>Discount</span><b>−{formatInr(pricing.discount, true)}</b></div>
              <p>{form.offerKind === 'custom' ? 'Customized values' : 'Standard package values'} will be immutable after assignment.</p>
            </>}
          </aside>
        </div>
        {error && <p className="admin-form-error" role="alert"><CircleAlert size={15} />{error}</p>}
        <footer><button type="button" className="admin-button admin-button--ghost" onClick={onClose}>Cancel</button><button type="submit" className="admin-button" disabled={saving || !pricing || !form.clientId}>{saving ? 'Assigning…' : 'Assign and freeze price'}</button></footer>
      </form>
    </dialog>
  )
}

function PaymentEditor({ assignment, remaining, onClose, onSaved }: {
  assignment: ClientOffer
  remaining: number
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState<PaymentInput>({ clientOfferId: assignment.id, clientId: assignment.client_id, amount: remaining, paidOn: today(), method: 'bank_transfer', reference: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { const dialog = dialogRef.current; if (dialog && !dialog.open) dialog.showModal() }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await recordPayment(form)
      onSaved(`${formatInr(form.amount, true)} was recorded.`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The payment could not be recorded.')
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="admin-dialog" onCancel={onClose} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)}>
        <header><div><span>MANUAL PAYMENT</span><h2>Record received funds</h2></div><button type="button" onClick={onClose} aria-label="Close payment editor"><X size={18} /></button></header>
        <div className="admin-form-grid">
          <label className="admin-field">Amount<input required autoFocus type="number" min="0.01" max={remaining} step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))} /></label>
          <label className="admin-field">Payment date<input required type="date" value={form.paidOn} onChange={(event) => setForm((current) => ({ ...current, paidOn: event.target.value }))} /></label>
          <label className="admin-field">Method<select value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value as PaymentMethod }))}><option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option></select><ChevronDown size={15} /></label>
          <label className="admin-field">Reference<input value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} placeholder="UTR or receipt number" /></label>
          <label className="admin-field admin-field--wide">Notes<textarea rows={3} maxLength={1000} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
        </div>
        {error && <p className="admin-form-error" role="alert"><CircleAlert size={15} />{error}</p>}
        <footer><button type="button" className="admin-button admin-button--ghost" onClick={onClose}>Cancel</button><button type="submit" className="admin-button" disabled={saving || form.amount <= 0 || form.amount > remaining}>{saving ? 'Recording…' : 'Record payment'}</button></footer>
      </form>
    </dialog>
  )
}

function paymentTotal(assignmentId: string, payments: PaymentEntry[]) {
  return payments.filter((payment) => payment.client_offer_id === assignmentId && payment.status === 'recorded').reduce((sum, payment) => sum + payment.amount, 0)
}

export function AdminBillingPage() {
  const { data, loading, error, reload } = useAdminWorkspace()
  const [assignmentClientId, setAssignmentClientId] = useState<string | null>(null)
  const [paying, setPaying] = useState<ClientOffer | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  if (!data) return <AdminState loading={loading} error={error} onRetry={() => void reload()} />

  const activeAssignments = data.clientOffers.filter((assignment) => assignment.status === 'active')
  const billed = activeAssignments.reduce((sum, assignment) => sum + assignment.total, 0)
  const paid = activeAssignments.reduce((sum, assignment) => sum + paymentTotal(assignment.id, data.payments), 0)
  const availableOffers = data.offers.filter((offer) => offer.active && !offer.archived_at)

  const mutate = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key); setNotice(null); setActionError(null)
    try { await action(); await reload(); setNotice(success) }
    catch (nextError) { setActionError(nextError instanceof Error ? nextError.message : 'The action could not be completed.') }
    finally { setBusy(null) }
  }
  const saved = async (message: string) => { setAssignmentClientId(null); setPaying(null); await reload(); setNotice(message) }

  return (
    <div className="admin-page">
      <header className="admin-page-head admin-page-head--actions"><div><p className="eyebrow"><span />COMMERCIAL CONTROL</p><h1>Assignments & payments</h1><p>Freeze exact client prices, preserve every agreement, and reconcile received payments.</p></div><button className="admin-button" type="button" disabled={!data.clients.length || !availableOffers.length} onClick={() => setAssignmentClientId('')}><Plus size={16} /> Assign package</button></header>

      <section className="admin-kpi-grid admin-kpi-grid--billing" aria-label="Commercial summary">
        <article><span><ReceiptIndianRupee size={16} /> ACTIVE BILLING</span><strong>{formatInr(billed)}</strong><small>{activeAssignments.length} active assignments</small></article>
        <article><span><Banknote size={16} /> RECEIVED</span><strong>{formatInr(paid)}</strong><small>manual recorded payments</small></article>
        <article className={billed - paid > 0 ? 'has-alert' : ''}><span><IndianRupee size={16} /> OUTSTANDING</span><strong>{formatInr(Math.max(0, billed - paid))}</strong><small>across active packages</small></article>
        <article><span><FileClock size={16} /> HISTORY</span><strong>{data.clientOffers.length.toString().padStart(2, '0')}</strong><small>immutable snapshots</small></article>
      </section>

      {(notice || actionError) && <p className={`admin-notice ${actionError ? 'admin-notice--error' : ''}`} role={actionError ? 'alert' : 'status'}>{actionError ? <CircleAlert size={15} /> : <BadgeCheck size={15} />}{actionError || notice}</p>}

      <section className="billing-client-grid" aria-label="Client billing">
        {data.clients.map((client) => {
          const assignments = data.clientOffers.filter((item) => item.client_id === client.id)
          const active = assignments.find((item) => item.status === 'active')
          const received = active ? paymentTotal(active.id, data.payments) : 0
          const remaining = active ? Math.max(0, active.total - received) : 0
          return (
            <article key={client.id} className="billing-client-card">
              <header><div><span>{client.status} CLIENT</span><h2>{client.name}</h2></div><span className={`status-pill status-pill--${active ? 'active' : 'disabled'}`}>{active ? 'package active' : 'unassigned'}</span></header>
              {active ? <>
                <div className="billing-client-total"><span>CURRENT AGREEMENT</span><strong>{formatInr(active.total, true)}</strong><small>{active.name} · {active.cycle_days} days</small></div>
                <div className="billing-progress" style={{ '--billing-progress': `${active.total ? Math.min(100, (received / active.total) * 100) : 0}%` } as CSSProperties}><i /><span>{formatInr(received, true)} received</span><strong>{formatInr(remaining, true)} due</strong></div>
                <div className="billing-card-actions">
                  <button type="button" disabled={!remaining} onClick={() => setPaying(active)}><Banknote size={14} />Record payment</button>
                  <button type="button" onClick={() => setExpanded((current) => current === client.id ? null : client.id)} aria-expanded={expanded === client.id}><Clock3 size={14} />History</button>
                  <button type="button" disabled={busy === active.id} onClick={() => void mutate(active.id, () => setClientOfferStatus(active.id, 'cancelled'), `${active.name} was cancelled; its pricing history is preserved.`)}>Cancel</button>
                </div>
              </> : <div className="billing-empty"><CalendarDays /><strong>No active commercial package</strong><button type="button" onClick={() => setAssignmentClientId(client.id)}>Assign now</button></div>}

              {expanded === client.id && <div className="billing-history">
                {assignments.map((assignment) => <div key={assignment.id}><span><i className={`status-pill status-pill--${assignment.status === 'active' ? 'active' : 'disabled'}`}>{assignment.status}</i>{assignment.name}<small>{assignment.starts_on} — {assignment.ends_on} · source v{assignment.source_offer_version ?? 'custom'}</small></span><strong>{formatInr(assignment.total, true)}</strong></div>)}
                {!assignments.length && <p>No assignment history yet.</p>}
                {data.payments.filter((payment) => payment.client_id === client.id).map((payment) => <div className="billing-payment-row" key={payment.id}><span><i className={`status-pill status-pill--${payment.status === 'recorded' ? 'active' : 'disabled'}`}>{payment.status}</i>{payment.method.replace('_', ' ')}<small>{payment.paid_on}{payment.reference ? ` · ${payment.reference}` : ''}</small></span><strong>{formatInr(payment.amount, true)}{payment.status === 'recorded' && <button type="button" title="Void payment" disabled={busy === payment.id} onClick={() => void mutate(payment.id, () => voidPayment(payment.id), 'Payment entry voided. Record a replacement if needed.')}><RotateCcw size={13} /></button>}</strong></div>)}
              </div>}
            </article>
          )
        })}
      </section>

      {!data.clients.length && <div className="admin-list-empty"><ReceiptIndianRupee /><strong>No clients available</strong><p>Create a client workspace before assigning a package.</p></div>}
      {assignmentClientId !== null && availableOffers.length > 0 && <AssignmentEditor clients={data.clients} offers={availableOffers} initialClientId={assignmentClientId} onClose={() => setAssignmentClientId(null)} onSaved={(message) => void saved(message)} />}
      {paying && <PaymentEditor assignment={paying} remaining={Math.max(0, paying.total - paymentTotal(paying.id, data.payments))} onClose={() => setPaying(null)} onSaved={(message) => void saved(message)} />}
    </div>
  )
}
