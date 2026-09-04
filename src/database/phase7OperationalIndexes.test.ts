import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve('supabase/migrations/20260904162835_phase_7_operational_indexes.sql'),
  'utf8',
).toLowerCase().replace(/\s+/g, ' ')

describe('Phase 7 operational indexes', () => {
  it('covers the remaining offer and audit foreign keys', () => {
    expect(migration).toContain('create index offers_source_offer_id_idx')
    expect(migration).toContain('create index client_offers_created_by_idx')
    expect(migration).toContain('create index payment_entries_created_by_idx')
  })
})
