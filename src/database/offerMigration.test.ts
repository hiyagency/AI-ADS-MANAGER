import { describe, expect, it } from 'vitest'
import offerMigration from '../../supabase/migrations/20260904154742_offer_catalog_31_day_packages.sql?raw'
import adminMigration from '../../supabase/migrations/20260904154745_phase_3_admin_client_management.sql?raw'

const offerSql = offerMigration.toLowerCase().replace(/\s+/g, ' ')
const adminSql = adminMigration.toLowerCase().replace(/\s+/g, ' ')

const offers = [
  ['local-starter', '200, 6200, 2170, 1116, 2000, 11486, 9985, 1, 11486'],
  ['local-growth', '400, 12400, 4340, 2232, 2000, 20972, 19471, 1, 20972'],
  ['performance', '600, 18600, 6510, 3348, 2000, 30458, 28957, 2, 32458'],
  ['scale', '800, 24800, 8680, 4464, 2000, 39944, 38443, 3, 43944'],
  ['accelerate', '950, 29450, 10307.50, 5301, 2000, 47058.50, 45557.50, 3, 51058.50'],
  ['market-leader', '1250, 38750, 13562.50, 6975, 2000, 61287.50, 59786.50, 4, 67287.50'],
  ['market-dominance', '1500, 46500, 16275, 8370, 2000, 73145, 71644, 5, 81145'],
] as const

describe('31-day offer migration', () => {
  it.each(['offer_catalogs', 'offers'])('enables RLS for %s', (table) => {
    expect(offerSql).toContain(`alter table public.${table} enable row level security`)
  })

  it('protects every auditable pricing formula with a database check', () => {
    for (const name of ['ad_budget', 'service_fee', 'gst', 'creative_charge', 'month_one_total', 'month_two_base', 'recommended_total']) {
      expect(offerSql).toContain(`constraint offers_${name}_formula check`)
    }
  })

  it('contains all seven approved package values', () => {
    for (const [slug, values] of offers) {
      expect(offerSql).toContain(`'${slug}'`)
      expect(offerSql).toContain(`, ${values},`)
    }
  })

  it('stores the exact 31-day rates and recurring software fee', () => {
    expect(offerSql).toContain("'inr', 31, 35, 18, 2000, 0, 499, 200, 400")
    expect(offerSql).toContain('month 2 base figures do not include a fresh creative')
  })
})

describe('Phase 3 admin migration', () => {
  it('adds offer assignment and admin-managed contact fields', () => {
    expect(adminSql).toContain('add column contact_name text')
    expect(adminSql).toContain('add column offer_id uuid references public.offers')
  })

  it('keeps browser writes narrow and prevents client hard deletion', () => {
    expect(adminSql).toContain('grant update (display_name, status) on table public.profiles to authenticated')
    expect(adminSql).toContain('grant select, insert, update on table public.clients to authenticated')
    expect(adminSql).not.toContain('grant select, insert, update, delete on table public.clients to authenticated')
  })

  it('only allows client-role profiles to be attached', () => {
    expect(adminSql).toContain("candidate.role = 'client'")
    expect(adminSql).toContain('(select private.is_active_admin())')
  })
})
