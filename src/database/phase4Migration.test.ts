import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const phase4 = readFileSync(resolve('supabase/migrations/20260904154747_phase_4_commercial_engine.sql'), 'utf8').toLowerCase().replace(/\s+/g, ' ')
const reporting = readFileSync(resolve('supabase/migrations/20260904154752_phase_5_7_reporting_and_sync.sql'), 'utf8').toLowerCase().replace(/\s+/g, ' ')

describe('Phase 4 commercial migration', () => {
  it.each(['client_offers', 'payment_entries'])('enables RLS for %s', (table) => {
    expect(phase4).toContain(`alter table public.${table} enable row level security`)
  })

  it('freezes assigned pricing and preserves payment facts', () => {
    expect(phase4).toContain('prevent_client_offer_pricing_mutation')
    expect(phase4).toContain('protect_payment_ledger')
    expect(phase4).toContain('void the entry and record a replacement')
  })

  it('enforces every client total inside Postgres', () => {
    for (const formula of ['ad_budget', 'service_fee', 'gst', 'creative_charge', 'gross_total', 'total']) {
      expect(phase4).toContain(`constraint client_offers_${formula}_formula check`)
    }
  })

  it('removes browser hard-delete access for offer templates', () => {
    expect(phase4).toContain('revoke delete on table public.offers from authenticated')
    expect(phase4).toContain('drop policy "active admins can delete offers"')
  })

  it('uses an RLS-bound invoker function for atomic assignment replacement', () => {
    expect(phase4).toContain('create or replace function public.assign_client_offer')
    expect(phase4).toContain('security invoker')
    expect(phase4).not.toContain('security definer\nset search_path')
  })
})

describe('Phase 5-7 reporting migration', () => {
  it.each(['meta_accounts', 'campaigns', 'ad_sets', 'ads', 'daily_metrics', 'sync_logs'])('enables RLS for %s', (table) => {
    expect(reporting).toContain(`alter table public.${table} enable row level security`)
  })

  it('keeps every reporting row tenant-owned', () => {
    expect(reporting.match(/client_id uuid not null/g)).toHaveLength(6)
    expect(reporting.match(/private\.can_access_client\(client_id\)/g)).toHaveLength(6)
  })

  it('does not create a token column in the exposed schema', () => {
    expect(reporting).not.toMatch(/access_token\s+text/)
    expect(reporting).toContain('access tokens remain server-only')
  })

  it('supports idempotent metric and entity upserts with unique constraints', () => {
    expect(reporting).toContain('campaigns_account_external_unique')
    expect(reporting).toContain('ad_sets_account_external_unique')
    expect(reporting).toContain('ads_account_external_unique')
    expect(reporting).toContain('daily_metrics_unique')
  })
})
