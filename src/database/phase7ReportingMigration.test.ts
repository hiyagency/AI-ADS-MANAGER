import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve('supabase/migrations/20260904161554_reporting_period_snapshots.sql'),
  'utf8',
).toLowerCase().replace(/\s+/g, ' ')

describe('Phase 7 reporting snapshot migration', () => {
  it('stores account and campaign snapshots for every dashboard period', () => {
    expect(migration).toContain("create type public.reporting_scope as enum ('account', 'campaign')")
    expect(migration).toContain("create type public.reporting_period_key as enum ('7d', '14d', '28d', 'month', 'lifetime')")
    expect(migration).toContain('create table public.reporting_snapshots')
    expect(migration).toContain('constraint reporting_snapshots_scope_shape check')
  })

  it('uses a stable conflict key for idempotent period replacement', () => {
    expect(migration).toContain('constraint reporting_snapshots_unique unique ( meta_account_id, scope_type, scope_external_id, period_key, attribution_window )')
  })

  it('protects tenant reads and reserves writes for the server', () => {
    expect(migration).toContain('alter table public.reporting_snapshots enable row level security')
    expect(migration).toContain('grant select on table public.reporting_snapshots to authenticated')
    expect(migration).toContain('grant select, insert, update, delete on table public.reporting_snapshots to service_role')
    expect(migration).toContain('private.can_access_client(client_id)')
  })

  it('documents why daily reach must not be summed', () => {
    expect(migration).toContain("use these instead of summing daily reach or frequency")
  })
})
