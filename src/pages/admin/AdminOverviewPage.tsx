import { ArrowRight, BadgeIndianRupee, CircleCheck, RadioTower, ReceiptIndianRupee, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatInr } from '../../admin/data'
import { useAdminWorkspace } from '../../admin/useAdminWorkspace'
import { AdminState } from '../../components/admin/AdminState'

export function AdminOverviewPage() {
  const { data, loading, error, reload } = useAdminWorkspace()
  if (!data) return <AdminState loading={loading} error={error} onRetry={() => void reload()} />

  const activeClients = data.clients.filter((client) => client.status === 'active')
  const activeOffers = data.offers.filter((offer) => offer.active)
  const publicOffers = activeOffers.filter((offer) => offer.is_public)
  const activeAssignments = data.clientOffers.filter((assignment) => assignment.status === 'active')
  const assignedClients = activeClients.filter((client) => activeAssignments.some((assignment) => assignment.client_id === client.id))
  const unassignedProfiles = data.profiles.filter((profile) => !data.memberships.some((item) => item.user_id === profile.id))
  const featuredOffer = activeOffers.find((offer) => offer.daily_budget === 400) ?? activeOffers[0]
  const activeBilled = activeAssignments.reduce((sum, assignment) => sum + assignment.total, 0)
  const activePaid = data.payments.filter((payment) => payment.status === 'recorded' && activeAssignments.some((assignment) => assignment.id === payment.client_offer_id)).reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="eyebrow"><span />HIY OPERATIONS · COMMAND CENTER</p>
          <h1>Performance command center</h1>
          <p>Control client access, commercial agreements, payments, Meta mappings, and synchronization health.</p>
        </div>
        <div className="admin-date-stamp"><RadioTower size={17} /><span>LOCAL SCHEMA</span><strong>Ready to deploy later</strong></div>
      </header>

      <section className="admin-kpi-grid" aria-label="Workspace summary">
        <article><span><UsersRound size={16} /> ACTIVE CLIENTS</span><strong>{activeClients.length.toString().padStart(2, '0')}</strong><small>{data.clients.length} total records</small></article>
        <article><span><BadgeIndianRupee size={16} /> LIVE OFFERS</span><strong>{publicOffers.length.toString().padStart(2, '0')}</strong><small>{activeOffers.length} active packages</small></article>
        <article><span><CircleCheck size={16} /> PACKAGE COVERAGE</span><strong>{activeClients.length ? Math.round((assignedClients.length / activeClients.length) * 100) : 0}%</strong><small>{assignedClients.length} clients assigned</small></article>
        <article className={activeBilled - activePaid > 0 ? 'has-alert' : ''}><span><ReceiptIndianRupee size={16} /> OUTSTANDING</span><strong>{formatInr(Math.max(0, activeBilled - activePaid))}</strong><small>{unassignedProfiles.length} unassigned logins</small></article>
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-panel admin-panel--clients">
          <div className="admin-panel__head"><div><span>CLIENT PULSE</span><h2>Recently updated</h2></div><Link to="/admin/clients">Manage clients <ArrowRight size={14} /></Link></div>
          <div className="admin-client-pulse">
            {data.clients.slice(0, 5).map((client, index) => {
              const assignment = activeAssignments.find((item) => item.client_id === client.id)
              return (
                <div key={client.id}>
                  <span className="admin-pulse-rank">{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{client.name}</strong><small>{assignment?.name ?? 'No commercial assignment'}</small></div>
                  <span className={`status-pill status-pill--${client.status}`}>{client.status}</span>
                </div>
              )
            })}
            {!data.clients.length && <p className="admin-empty-copy">No clients yet. Create the first workspace when the correct project is connected.</p>}
          </div>
        </article>

        <article className="admin-panel admin-panel--offer">
          <div className="admin-panel__head"><div><span>COMMERCIAL SIGNAL</span><h2>Recommended local test</h2></div><Link to="/admin/offers">View catalog <ArrowRight size={14} /></Link></div>
          {featuredOffer ? (
            <>
              <div className="admin-offer-hero"><span>{featuredOffer.name}</span><strong>{formatInr(featuredOffer.daily_budget)}<small>/day</small></strong><p>Practical Shahdol single-creative testing band</p></div>
              <div className="admin-mini-ledger"><div><span>31-day media</span><strong>{formatInr(featuredOffer.ad_budget)}</strong></div><div><span>Month 1 total</span><strong>{formatInr(featuredOffer.month_one_total)}</strong></div><div><span>Month 2 base</span><strong>{formatInr(featuredOffer.month_two_base)}</strong></div></div>
            </>
          ) : <p className="admin-empty-copy">The local offer migration is ready but has not been applied to a project.</p>}
        </article>

        <article className="admin-panel admin-panel--roadmap">
          <div className="admin-panel__head"><div><span>ROLLOUT CONTROL</span><h2>Local implementation</h2></div></div>
          <div className="admin-roadmap">
            <div className="is-done"><span>01</span><p><strong>Clients</strong><small>Create, edit, assign, disable</small></p><CircleCheck size={17} /></div>
            <div className="is-done"><span>02</span><p><strong>Offer catalog</strong><small>Seven exact 31-day packages</small></p><CircleCheck size={17} /></div>
            <div className="is-done"><span>03</span><p><strong>Commercial engine</strong><small>Snapshots and payment ledger</small></p><CircleCheck size={17} /></div>
            <div className="is-done"><span>04</span><p><strong>Client reporting</strong><small>Dashboard and metric periods</small></p><CircleCheck size={17} /></div>
            <div><span>05</span><p><strong>Production activation</strong><small>Needs Supabase, Meta and Netlify credentials</small></p><i /></div>
          </div>
        </article>
      </section>
    </div>
  )
}
