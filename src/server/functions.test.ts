import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(path), 'utf8')
const server = read('netlify/functions/_lib/server.ts')
const invite = read('netlify/functions/invite-client.mts')
const worker = read('netlify/functions/meta-sync-worker.mts')
const schedule = read('netlify/functions/meta-sync-schedule.mts')
const transport = read('netlify/functions/_lib/metaGraph.ts')
const discovery = read('netlify/functions/meta-accounts-available.mts')
const account = read('netlify/functions/meta-account.mts')
const tokenHealth = read('netlify/functions/meta-token-health.mts')
const disconnect = read('netlify/functions/meta-account-disconnect.mts')
const normalizers = read('src/meta/normalizers.ts')
const environment = read('.env.example')

describe('trusted server boundaries', () => {
  it('verifies an active admin before privileged browser actions', () => {
    expect(server).toContain("profile.role !== 'admin'")
    expect(server).toContain("profile.status !== 'active'")
    expect(invite).toContain('requireAdmin(request)')
  })

  it('rolls back a newly invited Auth user when tenant attachment fails', () => {
    expect(invite).toContain('admin.auth.admin.deleteUser(userId)')
    expect(invite).toContain('client_users')
  })

  it('uses the configured application origin for invitation redirects', () => {
    expect(invite).toContain("requiredServerValue('PUBLIC_APP_URL')")
    expect(invite).not.toContain('new URL(request.url).origin')
  })

  it('protects the worker with an independent server secret', () => {
    expect(worker).toContain('assertInternalRequest(request)')
    expect(server).toContain("required('SYNC_DISPATCH_SECRET')")
  })

  it('runs every six hours through background dispatch', () => {
    expect(schedule).toContain("schedule: '0 */6 * * *'")
    expect(worker).toContain('background: true')
    expect(schedule).toContain('settleWithConcurrency')
    expect(schedule).toContain(".order('id', { ascending: true })")
  })

  it('keeps scheduled Meta work disabled until credentials are verified', () => {
    expect(schedule).toContain("optionalServerValue('META_SYNC_ENABLED') !== 'true'")
    expect(environment).toContain('META_SYNC_ENABLED=false')
  })

  it('lets failed background work reject so Netlify can retry it', () => {
    expect(worker).not.toContain('respond(async')
    expect(worker).toContain('throw error')
    expect(worker).toContain("admin.rpc('fail_meta_sync'")
  })

  it('uses ownership-bound claims and finalizers for each client lease', () => {
    expect(worker).toContain("admin.rpc('claim_meta_sync'")
    expect(worker).toContain("admin.rpc('complete_meta_sync'")
    expect(worker).toContain('p_lock_owner: lockOwner')
  })

  it('discovers and verifies Meta accounts only behind active-admin checks', () => {
    expect(discovery).toContain('requireAdmin(request)')
    expect(discovery).toContain("'me/adaccounts'")
    expect(account).toContain('requireAdmin(request)')
    expect(account).toContain('fetchGraphObject<MetaAccountObject>')
  })

  it('checks token validity without returning a credential', () => {
    expect(tokenHealth).toContain('fetchMetaTokenHealth()')
    expect(transport).toContain("'debug_token'")
    expect(tokenHealth).not.toContain('META_ACCESS_TOKEN')
  })

  it('uses bearer credentials, strips tokenized paging URLs, and retries throttling', () => {
    expect(transport).toContain("authorization: `Bearer ${accessToken}`")
    expect(transport).toContain("url.searchParams.delete('access_token')")
    expect(transport).toContain('MAX_RETRIES = 3')
    expect(transport).toContain('status === 429')
  })

  it('disconnects mappings without deleting reporting history', () => {
    expect(disconnect).toContain("connection_status: 'disconnected'")
    expect(disconnect).not.toMatch(/\.delete\s*\(/)
  })

  it('records attribution, pagination, and retry diagnostics', () => {
    expect(worker).toContain('action_attribution_windows')
    expect(normalizers).toContain('available_metrics')
    expect(worker).toContain('pages_fetched')
    expect(worker).toContain('rate_limit_retries')
  })

  it('stores exact account and campaign aggregates for every dashboard window', () => {
    expect(worker).toContain('reportingPeriods(now, accountTimeZone)')
    expect(worker).toContain("level: 'account'")
    expect(worker).toContain("level: 'campaign'")
    expect(worker).toContain("admin.from('reporting_snapshots').upsert")
    expect(worker).toContain("onConflict: 'meta_account_id,scope_type,scope_external_id,period_key,attribution_window'")
  })

  it('marks entities missing from a later complete response as stale', () => {
    expect(worker).toContain("update({ is_current: false")
    expect(worker).toContain(".lt('last_seen_at', syncedAt)")
  })

  it('never exposes server credentials through Vite variables', () => {
    expect(environment).not.toMatch(/VITE_(SUPABASE_SECRET|SUPABASE_SERVICE|META_ACCESS|SYNC_DISPATCH)/)
    expect(environment).toContain('META_ACCESS_TOKEN=')
  })
})
