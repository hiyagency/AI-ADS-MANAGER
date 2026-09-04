import {
  Activity,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Building2,
  CircleAlert,
  CircleCheck,
  Gauge,
  IndianRupee,
  LoaderCircle,
  LogOut,
  MousePointerClick,
  RefreshCw,
  Target,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { loadClientDashboard, type ClientDashboardData } from '../client/data'
import { aggregateMetrics, aggregateSnapshots, DASHBOARD_RANGES, filterMetrics, metricCoverage, snapshotsForRange } from '../client/metrics'
import { Brand } from '../components/ui/Brand'
import type { DashboardDateRange } from '../types'
import type { Campaign, DailyMetric, ReportingSnapshot } from '../types/database'
import { formatInr } from '../admin/data'

function compact(value: number) {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function metricValue(value: number, kind: 'money' | 'number' | 'percent' = 'number') {
  if (kind === 'money') return formatInr(value, value > 0 && value < 100 ? true : false)
  if (kind === 'percent') return `${value.toFixed(2)}%`
  return compact(value)
}

function MetricTile({ icon, label, value, note, available = true }: { icon: ReactNode; label: string; value: string; note: string; available?: boolean }) {
  return <article className={`client-metric-tile ${available ? '' : 'is-unavailable'}`}><span>{icon}{label}</span><strong>{available ? value : '—'}</strong><small>{available ? note : 'Not returned by Meta for this period'}</small></article>
}

function SpendChart({ metrics }: { metrics: DailyMetric[] }) {
  const points = useMemo(() => {
    if (!metrics.length) return ''
    const byDate = new Map<string, number>()
    metrics.forEach((metric) => byDate.set(metric.metric_date, (byDate.get(metric.metric_date) ?? 0) + metric.spend))
    const values = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value)
    const max = Math.max(...values, 1)
    return values.map((value, index) => `${values.length === 1 ? 50 : (index / (values.length - 1)) * 100},${92 - (value / max) * 78}`).join(' ')
  }, [metrics])

  return (
    <div className="client-spend-chart">
      {points ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Daily advertising spend trend"><defs><linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--cyan)" stopOpacity=".35"/><stop offset="1" stopColor="var(--blue)" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} fill="url(#spend-fill)"/><polyline points={points} fill="none" stroke="var(--cyan)" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg> : <div className="client-chart-empty"><BarChart3 /><span>Trend appears after the first successful Meta synchronization.</span></div>}
    </div>
  )
}

function campaignTotals(campaign: Campaign, metrics: DailyMetric[], snapshots: ReportingSnapshot[]) {
  const exact = snapshots.filter((snapshot) => snapshot.campaign_id === campaign.id)
  return exact.length ? aggregateSnapshots(exact) : aggregateMetrics(metrics.filter((metric) => metric.campaign_id === campaign.id))
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ClientDashboardPage() {
  const { client, user, signOut } = useAuth()
  const [data, setData] = useState<ClientDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<DashboardDateRange>('28d')
  const [signingOut, setSigningOut] = useState(false)
  const [renderTime] = useState(() => Date.now())

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true); setError(null)
    try { setData(await loadClientDashboard(client.id)) }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Your dashboard could not be loaded.') }
    finally { setLoading(false) }
  }, [client])

  useEffect(() => {
    if (!client) return
    let active = true
    loadClientDashboard(client.id)
      .then((nextData) => { if (active) setData(nextData) })
      .catch((nextError: unknown) => { if (active) setError(nextError instanceof Error ? nextError.message : 'Your dashboard could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [client])

  const selectedMetrics = useMemo(() => filterMetrics(data?.metrics ?? [], range), [data?.metrics, range])
  const accountSnapshots = useMemo(() => snapshotsForRange(data?.snapshots ?? [], range, 'account'), [data?.snapshots, range])
  const campaignSnapshots = useMemo(() => snapshotsForRange(data?.snapshots ?? [], range, 'campaign'), [data?.snapshots, range])
  const hasExactPeriod = accountSnapshots.length > 0
  const totals = useMemo(() => hasExactPeriod ? aggregateSnapshots(accountSnapshots) : aggregateMetrics(selectedMetrics), [accountSnapshots, hasExactPeriod, selectedMetrics])
  const availabilityKnown = hasExactPeriod
    ? accountSnapshots.some((snapshot) => snapshot.available_metrics.length > 0)
    : selectedMetrics.some((metric) => metric.available_metrics.length > 0)
  const hasSelectedData = hasExactPeriod || selectedMetrics.length > 0
  const metricAvailable = (name: string) => hasSelectedData && (!availabilityKnown || totals.availableMetrics.includes(name))
  const dailyAvailabilityKnown = selectedMetrics.some((metric) => metric.available_metrics.length > 0)
  const coverage = metricCoverage(selectedMetrics)
  const snapshotStart = accountSnapshots.map((snapshot) => snapshot.period_start).sort().at(0)
  const snapshotEnd = accountSnapshots.map((snapshot) => snapshot.period_end).sort().at(-1)
  const reportingNote = hasExactPeriod && snapshotStart && snapshotEnd
    ? `Exact Meta aggregate for ${shortDate(snapshotStart)}–${shortDate(snapshotEnd)}.${accountSnapshots.length > 1 ? ' Reach is summed per ad account and audiences may overlap between accounts.' : ''}`
    : coverage
      ? `Meta aggregate snapshot pending. Additive totals use synchronized daily history from ${shortDate(coverage.start)}–${shortDate(coverage.end)}; reach stays hidden to avoid double-counting people.`
      : 'This reporting window will populate after the next successful Meta synchronization.'
  const activeAssignment = data?.assignments.find((assignment) => assignment.status === 'active')
  const cycleMetrics = activeAssignment ? (data?.metrics ?? []).filter((metric) => metric.metric_date >= activeAssignment.starts_on && metric.metric_date <= activeAssignment.ends_on) : []
  const cycleSpend = aggregateMetrics(cycleMetrics).spend
  const allocation = activeAssignment?.ad_budget ?? 0
  const remaining = Math.max(0, allocation - cycleSpend)
  const budgetUsed = allocation ? Math.min(100, (cycleSpend / allocation) * 100) : 0
  const paid = activeAssignment ? (data?.payments ?? []).filter((payment) => payment.client_offer_id === activeAssignment.id && payment.status === 'recorded').reduce((sum, payment) => sum + payment.amount, 0) : 0
  const lastSuccess = data?.metaAccounts.map((account) => account.last_success_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null
  const isStale = !lastSuccess || renderTime - new Date(lastSuccess).getTime() > 8 * 60 * 60 * 1000

  if (loading && !data) return <main className="client-dashboard-state"><LoaderCircle className="spin" /><strong>Preparing your performance cockpit</strong><span>Checking commercial and campaign data…</span></main>
  if (error && !data) return <main className="client-dashboard-state"><CircleAlert /><strong>We could not open your dashboard</strong><span>{error}</span><button type="button" onClick={() => void load()}><RefreshCw size={15} />Try again</button></main>

  const handleSignOut = async () => { setSigningOut(true); await signOut(); setSigningOut(false) }

  return (
    <div className="client-dashboard">
      <aside className="client-dashboard-sidebar">
        <Link to="/" aria-label="ADS MANAGER home"><Brand /></Link>
        <nav aria-label="Client dashboard"><a href="#overview" className="is-active"><Gauge />Overview</a><a href="#performance"><Activity />Performance</a><a href="#campaigns"><Target />Campaigns</a><a href="#package"><IndianRupee />Package</a></nav>
        <div className="client-dashboard-identity"><span><Building2 /></span><div><strong>{client?.name}</strong><small>{user?.email}</small></div></div>
        <button type="button" onClick={() => void handleSignOut()} disabled={signingOut}><LogOut size={15} />{signingOut ? 'Signing out' : 'Sign out'}</button>
      </aside>

      <main className="client-dashboard-main">
        <header className="client-dashboard-topbar"><div><i className={isStale ? 'is-stale' : ''}/><span>{isStale ? 'DATA UPDATE PENDING' : 'REPORTING CURRENT'}</span></div><span>{lastSuccess ? `Last sync ${new Date(lastSuccess).toLocaleString('en-IN')}` : 'Awaiting first Meta sync'}</span></header>
        <div className="client-dashboard-content">
          <section id="overview" className="client-dashboard-head"><div><p className="eyebrow"><span />CLIENT PERFORMANCE</p><h1>{client?.name}</h1><p>Every rupee, result, and campaign signal—without the Meta Ads Manager complexity.</p></div><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={15}/>{loading ? 'Refreshing' : 'Refresh data'}</button></section>

          <section className="client-investment-grid" aria-label="Investment summary">
            <article className="client-investment-hero"><span>ACTIVE PACKAGE</span><h2>{activeAssignment?.name ?? 'No package assigned'}</h2><strong>{activeAssignment ? formatInr(activeAssignment.total, true) : '—'}</strong><small>{activeAssignment ? `${activeAssignment.starts_on} — ${activeAssignment.ends_on}` : 'Contact HIY AGENCY to activate a commercial package.'}</small></article>
            <article><span>TOTAL RECEIVED</span><strong>{activeAssignment ? formatInr(paid, true) : '—'}</strong><small>{activeAssignment ? `${formatInr(Math.max(0, activeAssignment.total - paid), true)} outstanding` : 'No active agreement'}</small></article>
            <article><span>META ALLOCATION</span><strong>{activeAssignment ? formatInr(allocation, true) : '—'}</strong><small>Advertising media only</small></article>
            <article className="client-budget-gauge"><span>CYCLE BUDGET USED</span><strong>{budgetUsed.toFixed(1)}%</strong><div style={{ '--budget-used': `${budgetUsed}%` } as CSSProperties}><i /></div><small>{formatInr(cycleSpend, true)} spent · {formatInr(remaining, true)} remaining</small></article>
          </section>

          <section id="performance" className="client-performance-section">
            <header><div><span>PERFORMANCE WINDOW</span><h2>Campaign outcomes</h2></div><div className="client-range-tabs" role="group" aria-label="Campaign date range">{DASHBOARD_RANGES.map((item) => <button type="button" key={item.id} className={range === item.id ? 'is-active' : ''} aria-pressed={range === item.id} onClick={() => setRange(item.id)}>{item.label}</button>)}</div></header>
            <div className="client-performance-layout">
              <article className="client-chart-panel"><div><span>AD SPEND</span><strong>{metricAvailable('spend') ? formatInr(totals.spend, true) : '—'}</strong><small>{coverage ? `Daily trend coverage · ${shortDate(coverage.start)}–${shortDate(coverage.end)}` : 'No synchronized daily trend in this window'}</small></div><SpendChart metrics={selectedMetrics.filter((metric) => !dailyAvailabilityKnown || metric.available_metrics.includes('spend'))} /></article>
              <div className="client-metric-grid">
                <MetricTile icon={<Target />} label="Results" available={metricAvailable('results')} value={metricValue(totals.results)} note={totals.results ? `${formatInr(totals.costPerResult, true)} per result` : 'No results recorded'} />
                <MetricTile icon={<UsersRound />} label="Reach" available={metricAvailable('reach')} value={metricValue(totals.reach)} note={metricAvailable('impressions') ? `${metricValue(totals.impressions)} impressions` : 'Impressions unavailable'} />
                <MetricTile icon={<MousePointerClick />} label="Clicks" available={metricAvailable('clicks')} value={metricValue(totals.clicks)} note={metricAvailable('ctr') ? `${metricValue(totals.ctr, 'percent')} CTR` : 'CTR unavailable'} />
                <MetricTile icon={<IndianRupee />} label="CPC / CPM" available={metricAvailable('cpc') || metricAvailable('cpm')} value={metricAvailable('cpc') ? metricValue(totals.cpc, 'money') : '—'} note={metricAvailable('cpm') ? `${metricValue(totals.cpm, 'money')} CPM` : 'CPM unavailable'} />
              </div>
            </div>
            <p className={`client-reporting-note ${hasExactPeriod ? 'is-exact' : ''}`} aria-live="polite">{reportingNote}</p>
          </section>

          <section id="campaigns" className="client-campaign-section">
            <header><div><span>CAMPAIGN DETAIL</span><h2>What is running</h2></div><small>{data?.campaigns.length ?? 0} campaigns connected · {campaignSnapshots.length ? 'exact selected-window totals' : 'synced daily coverage'}</small></header>
            <div className="client-campaign-table">
              <div className="client-campaign-table__head"><span>Campaign</span><span>Spend</span><span>Results</span><span>Cost / result</span><span>CTR</span><span>Status</span></div>
              {data?.campaigns.map((campaign) => {
                const campaignMetric = campaignTotals(campaign, selectedMetrics, campaignSnapshots)
                return <article key={campaign.id}><div><strong>{campaign.name}</strong><small>{campaign.objective?.replaceAll('_', ' ') || 'Campaign objective'}</small></div><strong>{formatInr(campaignMetric.spend, true)}</strong><strong>{metricValue(campaignMetric.results)}</strong><strong>{formatInr(campaignMetric.costPerResult, true)}</strong><strong>{campaignMetric.ctr.toFixed(2)}%</strong><span className={`status-pill status-pill--${campaign.effective_status === 'ACTIVE' ? 'active' : 'disabled'}`}>{campaign.effective_status.toLowerCase()}</span></article>
              })}
              {!data?.campaigns.length && <div className="client-campaign-empty"><Target /><strong>No synchronized campaigns yet</strong><p>Your commercial package is still visible. Performance will appear after HIY connects and synchronizes the Meta account.</p></div>}
            </div>
          </section>

          <section id="package" className="client-package-section">
            <header><div><span>COMMERCIAL TRANSPARENCY</span><h2>Your exact package</h2></div>{activeAssignment && <span className="status-pill status-pill--active"><CircleCheck size={13}/>price frozen</span>}</header>
            {activeAssignment ? <div className="client-package-ledger">
              <div><span>Meta advertising spend<small>{formatInr(activeAssignment.daily_budget)}/day × {activeAssignment.cycle_days} days</small></span><strong>{formatInr(activeAssignment.ad_budget, true)}</strong></div>
              <div><span>HIY service charge<small>{activeAssignment.service_rate}% of Meta media spend</small></span><strong>{formatInr(activeAssignment.service_fee, true)}</strong></div>
              <div><span>GST on Meta media<small>{activeAssignment.gst_rate}% applied to advertising spend</small></span><strong>{formatInr(activeAssignment.gst, true)}</strong></div>
              <div><span>Creative production<small>{activeAssignment.included_creatives} × {formatInr(activeAssignment.creative_unit_price, true)}</small></span><strong>{formatInr(activeAssignment.creative_charge, true)}</strong></div>
              {(activeAssignment.ai_manager_fee > 0 || activeAssignment.additional_charges > 0) && <div><span>Software and additional charges</span><strong>{formatInr(activeAssignment.ai_manager_fee + activeAssignment.additional_charges, true)}</strong></div>}
              {activeAssignment.discount > 0 && <div className="is-discount"><span>Commercial discount</span><strong>−{formatInr(activeAssignment.discount, true)}</strong></div>}
              <footer><span>COMPLETE CLIENT TOTAL<small>{activeAssignment.billing_type.replace('_', ' ')} agreement · snapshot v{activeAssignment.source_offer_version ?? 'custom'}</small></span><strong>{formatInr(activeAssignment.total, true)}</strong></footer>
            </div> : <div className="client-campaign-empty"><Banknote /><strong>No commercial assignment yet</strong><p>HIY AGENCY will publish the full auditable breakdown here when your package is activated.</p></div>}
          </section>

          <footer className="client-dashboard-footer"><span>HIY AGENCY · ADS MANAGER</span><a href="https://hiy.agency/" target="_blank" rel="noreferrer">Agency website <ArrowUpRight size={13}/></a></footer>
        </div>
      </main>
    </div>
  )
}
