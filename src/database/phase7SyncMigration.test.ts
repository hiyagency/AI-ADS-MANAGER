import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve('supabase/migrations/20260904161551_phase_7_sync_reliability.sql'),
  'utf8',
).toLowerCase().replace(/\s+/g, ' ')

describe('Phase 7 synchronization reliability migration', () => {
  it('adds owned leases and preserves credential warnings', () => {
    expect(migration).toContain('add column sync_lock_owner text')
    expect(migration).toContain('add column credential_warning text')
    expect(migration).toContain("sync_locked_until = claimed_at + interval '16 minutes'")
  })

  it('serializes synchronization claims per client', () => {
    expect(migration).toContain('pg_advisory_xact_lock(hashtextextended(target_client_id::text, 0))')
    expect(migration).toContain('held.client_id = target_client_id')
  })

  it('releases a lease only through ownership-bound finalizers', () => {
    expect(migration).toContain('create or replace function public.complete_meta_sync')
    expect(migration).toContain('create or replace function public.fail_meta_sync')
    expect(migration.match(/account\.sync_lock_owner = p_lock_owner/g)).toHaveLength(3)
  })

  it('makes stale entity state explicit and indexes reconciliation paths', () => {
    expect(migration.match(/add column is_current boolean not null default true/g)).toHaveLength(3)
    expect(migration).toContain('campaigns_account_current_seen_idx')
    expect(migration).toContain('ad_sets_account_current_seen_idx')
    expect(migration).toContain('ads_account_current_seen_idx')
  })

  it('adds the missing foreign-key indexes', () => {
    expect(migration).toContain('create index ads_ad_set_id_idx')
    expect(migration).toContain('create index sync_logs_requested_by_idx')
  })

  it('keeps synchronization RPCs service-only and security invoker', () => {
    expect(migration.match(/security invoker/g)).toHaveLength(3)
    expect(migration).toContain('revoke all on function public.claim_meta_sync(uuid, uuid, text) from public, anon, authenticated')
    expect(migration).toContain('grant execute on function public.claim_meta_sync(uuid, uuid, text) to service_role')
  })
})
