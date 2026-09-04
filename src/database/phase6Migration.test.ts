import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve('supabase/migrations/20260904154754_phase_6_meta_integration_hardening.sql'),
  'utf8',
).toLowerCase().replace(/\s+/g, ' ')

describe('Phase 6 Meta integration hardening migration', () => {
  it('stores safe account verification and synchronization diagnostics', () => {
    expect(migration).toContain('add column business_name text')
    expect(migration).toContain('add column remote_account_status integer')
    expect(migration).toContain('add column last_verified_at timestamptz')
    expect(migration).toContain('add column pages_fetched integer')
    expect(migration).toContain('add column rate_limit_retries integer')
    expect(migration).toContain('add column api_usage jsonb')
  })

  it('distinguishes unavailable Meta metrics from zero', () => {
    expect(migration).toContain("add column available_metrics text[] not null default '{}'::text[]")
    expect(migration).toContain('daily_metrics_available_metrics_valid')
  })

  it.each([
    'meta_accounts_client_id_idx',
    'ad_sets_client_id_idx',
    'ads_client_id_idx',
    'daily_metrics_meta_account_date_idx',
    'sync_logs_client_created_at_idx',
  ])('adds the %s access index', (index) => {
    expect(migration).toContain(`create index ${index}`)
  })

  it('never stores Meta credentials in the database', () => {
    expect(migration).not.toMatch(/add column [a-z_]*(access_token|app_secret|credential|secret)/)
    expect(migration).toContain('credentials remain exclusively in server environment variables')
  })
})
