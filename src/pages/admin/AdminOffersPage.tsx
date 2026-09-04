import {
  Archive,
  BadgeCheck,
  CircleAlert,
  Copy,
  Eye,
  EyeOff,
  Film,
  IndianRupee,
  Layers3,
  Pencil,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  archiveOffer,
  duplicateOffer,
  formatInr,
  saveOffer,
  setOfferVisibility,
  slugifyOfferName,
  type OfferInput,
} from '../../admin/data'
import { useAdminWorkspace } from '../../admin/useAdminWorkspace'
import { AdminState } from '../../components/admin/AdminState'
import type { Offer, OfferCatalog, OfferCategory } from '../../types/database'
import { calculateCatalogPricing, COMMERCIAL_DEFAULTS } from '../../utils/commercialPricing'

const categories: { id: OfferCategory; label: string; note: string }[] = [
  { id: 'local_growth', label: 'Local growth', note: 'Efficient testing and dependable local acquisition.' },
  { id: 'scale', label: 'Scale', note: 'More variants and wider geography as spend rises.' },
  { id: 'market_leadership', label: 'Market leadership', note: 'For strong demand, fast response, and broad coverage.' },
]

function offerToInput(offer: Offer): OfferInput {
  return {
    catalogId: offer.catalog_id,
    name: offer.name,
    slug: offer.slug,
    description: offer.description,
    category: offer.category,
    offerKind: offer.offer_kind,
    billingType: offer.billing_type,
    cycleDays: offer.cycle_days,
    dailyBudget: offer.daily_budget,
    serviceRate: offer.service_rate,
    gstRate: offer.gst_rate,
    creativeUnitPrice: offer.creative_unit_price,
    includedCreatives: offer.included_creatives,
    recommendedCreatives: offer.recommended_creatives,
    additionalCharges: offer.additional_charges,
    aiManagerMonthOneFee: offer.ai_manager_month_one_fee,
    aiManagerRecurringFee: offer.ai_manager_recurring_fee,
    active: offer.active,
    isPublic: offer.is_public,
    sortOrder: offer.sort_order,
  }
}

function emptyOffer(catalog: OfferCatalog, sortOrder: number): OfferInput {
  return {
    catalogId: catalog.id,
    name: '',
    slug: '',
    description: '',
    category: 'local_growth',
    offerKind: 'custom',
    billingType: 'monthly',
    cycleDays: catalog.cycle_days,
    dailyBudget: catalog.recommended_testing_min_daily,
    serviceRate: catalog.service_rate,
    gstRate: catalog.gst_rate,
    creativeUnitPrice: catalog.basic_creative_price,
    includedCreatives: COMMERCIAL_DEFAULTS.includedCreatives,
    recommendedCreatives: COMMERCIAL_DEFAULTS.includedCreatives,
    additionalCharges: 0,
    aiManagerMonthOneFee: catalog.ai_manager_month_one_fee,
    aiManagerRecurringFee: catalog.ai_manager_recurring_fee,
    active: false,
    isPublic: false,
    sortOrder,
  }
}

function OfferEditor({ offer, catalogs, sortOrder, onClose, onSaved }: {
  offer: Offer | null
  catalogs: OfferCatalog[]
  sortOrder: number
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState<OfferInput>(() => offer
    ? offerToInput(offer)
    : emptyOffer(catalogs[0], sortOrder))
  const [slugTouched, setSlugTouched] = useState(Boolean(offer))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const pricing = useMemo(() => {
    try {
      return calculateCatalogPricing({
        cycleDays: form.cycleDays,
        dailyBudget: form.dailyBudget,
        serviceRate: form.serviceRate,
        gstRate: form.gstRate,
        creativeUnitPrice: form.creativeUnitPrice,
        includedCreatives: form.includedCreatives,
        aiManagerFee: form.aiManagerMonthOneFee,
        additionalCharges: form.additionalCharges,
        discount: 0,
        recurringAiManagerFee: form.aiManagerRecurringFee,
        recommendedCreatives: form.recommendedCreatives,
      })
    } catch {
      return null
    }
  }, [form])

  const text = (field: keyof OfferInput, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }))
  }
  const numeric = (field: keyof OfferInput, value: string) => {
    setForm((current) => ({ ...current, [field]: Number(value) }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await saveOffer(form, offer?.id)
      onSaved(offer ? `${form.name} was updated.` : `${form.name} was created as a private draft.`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The offer could not be saved.')
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="admin-dialog admin-dialog--wide" onCancel={onClose} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)}>
        <header>
          <div><span>{offer ? `EDIT OFFER · V${offer.version}` : 'NEW CUSTOM OFFER'}</span><h2>{offer?.name ?? 'Build an exact package'}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close offer editor"><X size={18} /></button>
        </header>
        <div className="admin-offer-editor">
          <div className="admin-form-grid">
            <label className="admin-field admin-field--wide">Offer name<input required autoFocus value={form.name} onChange={(event) => {
              const name = event.target.value
              setForm((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugifyOfferName(name) }))
            }} placeholder="e.g. Shahdol Growth Custom" /></label>
            <label className="admin-field">Offer slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => { setSlugTouched(true); text('slug', slugifyOfferName(event.target.value)) }} /></label>
            <label className="admin-field">Catalog<select value={form.catalogId} onChange={(event) => text('catalogId', event.target.value)}>{catalogs.map((catalog) => <option value={catalog.id} key={catalog.id}>{catalog.name}</option>)}</select></label>
            <label className="admin-field">Category<select value={form.category} onChange={(event) => text('category', event.target.value)}>{categories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label>
            <label className="admin-field">Billing<select value={form.billingType} onChange={(event) => text('billingType', event.target.value)}><option value="monthly">Monthly</option><option value="one_time">One-time</option></select></label>
            <label className="admin-field admin-field--wide">Description<textarea rows={3} maxLength={1000} value={form.description} onChange={(event) => text('description', event.target.value)} placeholder="What this commercial package is designed to achieve." /></label>
            <label className="admin-field">Cycle days<input required type="number" min="1" max="366" value={form.cycleDays} onChange={(event) => numeric('cycleDays', event.target.value)} /></label>
            <label className="admin-field">Daily Meta budget<input required type="number" min="0" step="0.01" value={form.dailyBudget} onChange={(event) => numeric('dailyBudget', event.target.value)} /></label>
            <label className="admin-field">HIY service %<input required type="number" min="0" max="100" step="0.01" value={form.serviceRate} onChange={(event) => numeric('serviceRate', event.target.value)} /></label>
            <label className="admin-field">GST on media %<input required type="number" min="0" max="100" step="0.01" value={form.gstRate} onChange={(event) => numeric('gstRate', event.target.value)} /></label>
            <label className="admin-field">Creative unit price<input required type="number" min="0" step="0.01" value={form.creativeUnitPrice} onChange={(event) => numeric('creativeUnitPrice', event.target.value)} /></label>
            <label className="admin-field">Included creatives<input required type="number" min="0" step="1" value={form.includedCreatives} onChange={(event) => numeric('includedCreatives', event.target.value)} /></label>
            <label className="admin-field">Recommended creatives<input required type="number" min={form.includedCreatives} step="1" value={form.recommendedCreatives} onChange={(event) => numeric('recommendedCreatives', event.target.value)} /></label>
            <label className="admin-field">Additional charges<input required type="number" min="0" step="0.01" value={form.additionalCharges} onChange={(event) => numeric('additionalCharges', event.target.value)} /></label>
            <label className="admin-field">AI Manager · Month 1<input required type="number" min="0" step="0.01" value={form.aiManagerMonthOneFee} onChange={(event) => numeric('aiManagerMonthOneFee', event.target.value)} /></label>
            <label className="admin-field">AI Manager · recurring<input required type="number" min="0" step="0.01" value={form.aiManagerRecurringFee} onChange={(event) => numeric('aiManagerRecurringFee', event.target.value)} /></label>
          </div>
          <aside className="admin-price-preview" aria-live="polite">
            <span>LIVE COMMERCIAL TOTAL</span>
            <strong>{pricing ? formatInr(pricing.total, true) : 'Check values'}</strong>
            {pricing && <>
              <div><span>Meta media</span><b>{formatInr(pricing.adBudget, true)}</b></div>
              <div><span>HIY service</span><b>{formatInr(pricing.serviceFee, true)}</b></div>
              <div><span>GST on media</span><b>{formatInr(pricing.gst, true)}</b></div>
              <div><span>Creative</span><b>{formatInr(pricing.creativeCharge, true)}</b></div>
              <div><span>Other + software</span><b>{formatInr(pricing.additionalCharges + pricing.aiManagerFee, true)}</b></div>
              <p>Month 2 base <b>{formatInr(pricing.monthTwoBase, true)}</b></p>
              <p>Recommended production <b>{formatInr(pricing.recommendedMonthOneTotal, true)}</b></p>
            </>}
          </aside>
        </div>
        {error && <p className="admin-form-error" role="alert"><CircleAlert size={15} />{error}</p>}
        <footer><button type="button" className="admin-button admin-button--ghost" onClick={onClose}>Cancel</button><button type="submit" className="admin-button" disabled={saving || !pricing}>{saving ? 'Saving…' : offer ? 'Save new version' : 'Create private draft'}</button></footer>
      </form>
    </dialog>
  )
}

function OfferCard({ offer, busy, onAction }: {
  offer: Offer
  busy: boolean
  onAction: (action: 'public' | 'active' | 'edit' | 'duplicate' | 'archive') => void
}) {
  return (
    <article className={`admin-offer-card ${!offer.active ? 'is-inactive' : ''} ${offer.archived_at ? 'is-archived' : ''}`}>
      <header>
        <div><span>₹{offer.daily_budget}/DAY · {offer.cycle_days} DAYS · V{offer.version}</span><h3>{offer.name}</h3></div>
        <span className={`status-pill status-pill--${offer.archived_at ? 'disabled' : offer.active ? 'active' : 'disabled'}`}>{offer.archived_at ? 'archived' : offer.active ? 'active' : 'draft'}</span>
      </header>
      <div className="admin-offer-card__price"><strong>{formatInr(offer.month_one_total, true)}</strong><span>MONTH 1 · {offer.offer_kind} · {offer.billing_type.replace('_', ' ')}</span></div>
      <div className="admin-offer-card__ledger">
        <div><span>Meta media</span><strong>{formatInr(offer.ad_budget, true)}</strong></div>
        <div><span>HIY service · {offer.service_rate}%</span><strong>{formatInr(offer.service_fee, true)}</strong></div>
        <div><span>GST on media · {offer.gst_rate}%</span><strong>{formatInr(offer.gst, true)}</strong></div>
        <div><span>Creative · {offer.included_creatives} included</span><strong>{formatInr(offer.creative_charge, true)}</strong></div>
      </div>
      <div className="admin-offer-card__recommendation"><Film size={15} /><span><strong>{offer.recommended_creatives} creatives recommended</strong>{formatInr(offer.recommended_month_one_total, true)} Month 1 at recommended production</span></div>
      <footer className="admin-offer-actions">
        {!offer.archived_at && <>
          <button type="button" aria-pressed={offer.is_public} disabled={busy} onClick={() => onAction('public')}>{offer.is_public ? <Eye size={14} /> : <EyeOff size={14} />}{offer.is_public ? 'Public' : 'Private'}</button>
          <button type="button" aria-pressed={offer.active} disabled={busy} onClick={() => onAction('active')}>{offer.active ? <BadgeCheck size={14} /> : <CircleAlert size={14} />}{offer.active ? 'Enabled' : 'Draft'}</button>
          <button type="button" disabled={busy} onClick={() => onAction('edit')}><Pencil size={14} />Edit</button>
          <button type="button" disabled={busy} onClick={() => onAction('archive')}><Archive size={14} />Archive</button>
        </>}
        <button type="button" disabled={busy} onClick={() => onAction('duplicate')}><Copy size={14} />Duplicate</button>
      </footer>
    </article>
  )
}

export function AdminOffersPage() {
  const { data, loading, error, reload } = useAdminWorkspace()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Offer | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!data) return <AdminState loading={loading} error={error} onRetry={() => void reload()} />
  const catalog = data.catalogs[0]
  const visibleOffers = data.offers.filter((offer) => showArchived ? Boolean(offer.archived_at) : !offer.archived_at)

  const mutate = async (offer: Offer, action: 'public' | 'active' | 'duplicate' | 'archive') => {
    setBusyId(offer.id)
    setNotice(null)
    setActionError(null)
    try {
      if (action === 'public') await setOfferVisibility(offer.id, 'is_public', !offer.is_public)
      if (action === 'active') await setOfferVisibility(offer.id, 'active', !offer.active)
      if (action === 'duplicate') await duplicateOffer(offer)
      if (action === 'archive') await archiveOffer(offer.id)
      await reload()
      setNotice(action === 'duplicate' ? `${offer.name} was duplicated as a private draft.` : `${offer.name} was updated.`)
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'The offer could not be changed.')
    } finally {
      setBusyId(null)
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
        <div><p className="eyebrow"><span />OFFER ENGINE</p><h1>31-day package catalog</h1><p>Build standard and client-ready custom packages while every assigned price remains frozen.</p></div>
        <button className="admin-button" type="button" disabled={!catalog} onClick={() => setEditing('new')}><Plus size={16} /> New offer</button>
      </header>

      {catalog && (
        <section className="admin-catalog-banner">
          <div><span>AUTHORITATIVE COMMERCIAL MODEL</span><h2>{catalog.subtitle}</h2><p>{catalog.summary}</p></div>
          <div className="admin-catalog-facts"><div><IndianRupee size={16} /><span>Service</span><strong>{catalog.service_rate}% of media</strong></div><div><Sparkles size={16} /><span>Creative</span><strong>from {formatInr(catalog.basic_creative_price)}</strong></div><div><BadgeCheck size={16} /><span>AI Manager</span><strong>{formatInr(catalog.ai_manager_month_one_fee)} Month 1</strong></div></div>
        </section>
      )}

      <div className="admin-toolbar admin-toolbar--compact">
        <div className="admin-filter" aria-label="Offer archive filter">
          <button type="button" className={!showArchived ? 'is-active' : ''} aria-pressed={!showArchived} onClick={() => setShowArchived(false)}>Current</button>
          <button type="button" className={showArchived ? 'is-active' : ''} aria-pressed={showArchived} onClick={() => setShowArchived(true)}>Archived</button>
        </div>
        <span className="admin-result-count">{visibleOffers.length} {showArchived ? 'archived' : 'current'} offers</span>
      </div>

      {(notice || actionError) && <p className={`admin-notice ${actionError ? 'admin-notice--error' : ''}`} role={actionError ? 'alert' : 'status'}>{actionError ? <CircleAlert size={15} /> : <BadgeCheck size={15} />}{actionError || notice}</p>}

      {categories.map((category) => {
        const offers = visibleOffers.filter((offer) => offer.category === category.id)
        if (!offers.length) return null
        return (
          <section className="admin-offer-group" key={category.id}>
            <header><div><span>{category.label}</span><p>{category.note}</p></div><strong>{String(offers.length).padStart(2, '0')}</strong></header>
            <div className="admin-offer-grid">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} busy={busyId === offer.id} onAction={(action) => action === 'edit' ? setEditing(offer) : void mutate(offer, action)} />)}</div>
          </section>
        )
      })}

      {!visibleOffers.length && <div className="admin-list-empty"><Layers3 /><strong>{showArchived ? 'No archived offers' : 'No current offers'}</strong><p>Create a private draft or change the archive filter.</p></div>}

      {catalog && <section className="admin-policy-note"><CircleAlert size={18} /><div><strong>Pricing authority</strong><p>The 31-day catalog is used for client agreements. The public 28-day niche explorer remains a non-binding planning estimate.</p><small>Every client assignment stores its own immutable price snapshot and source version.</small></div></section>}

      {editing && catalog && <OfferEditor offer={editing === 'new' ? null : editing} catalogs={data.catalogs} sortOrder={Math.max(0, ...data.offers.map((offer) => offer.sort_order)) + 1} onClose={() => setEditing(null)} onSaved={(message) => void saved(message)} />}
    </div>
  )
}
