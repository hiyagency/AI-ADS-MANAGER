import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve('supabase/migrations/20260904163358_phase_7_composite_foreign_key_indexes.sql'),
  'utf8',
).toLowerCase().replace(/\s+/g, ' ')

describe('Phase 7 composite foreign-key indexes', () => {
  it('covers all composite tenant foreign keys reported by the database advisor', () => {
    const expectedIndexes = [
      'ad_sets_account_client_fk_idx',
      'ad_sets_campaign_client_fk_idx',
      'ads_account_client_fk_idx',
      'ads_ad_set_client_fk_idx',
      'ads_campaign_client_fk_idx',
      'campaigns_account_client_fk_idx',
      'daily_metrics_account_client_fk_idx',
      'daily_metrics_campaign_client_fk_idx',
      'payment_entries_offer_client_fk_idx',
      'reporting_snapshots_account_client_fk_idx',
      'reporting_snapshots_campaign_client_fk_idx',
      'sync_logs_account_client_fk_idx',
    ]

    for (const indexName of expectedIndexes) {
      expect(migration).toContain(`create index ${indexName}`)
    }
  })
})
