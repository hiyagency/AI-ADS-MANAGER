import { describe, expect, it } from 'vitest'
import migration from '../../supabase/migrations/20260904154739_phase_2_multi_tenant_auth.sql?raw'

const sql = migration.toLowerCase().replace(/\s+/g, ' ')

describe('Phase 2 database migration', () => {
  it.each(['profiles', 'clients', 'client_users'])('enables RLS for %s', (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security`)
  })

  it('creates fail-closed profiles without metadata-based authorization', () => {
    expect(sql).toMatch(/role public\.app_role not null default 'client'/)
    expect(sql).toMatch(/status public\.entity_status not null default 'disabled'/)
    expect(sql).not.toContain('raw_user_meta_data')
  })

  it('keeps authorization helpers private and hardened', () => {
    expect(sql).toContain('create schema if not exists private')
    expect(sql.match(/security definer/g)).toHaveLength(3)
    expect(sql.match(/set search_path = ''/g)).toHaveLength(4)
    expect(sql).toContain('revoke all on schema private from public')
  })

  it('gives authenticated users read-only access to foundation tables', () => {
    expect(sql).toContain('grant select on table public.profiles to authenticated')
    expect(sql).toContain('grant select on table public.clients to authenticated')
    expect(sql).toContain('grant select on table public.client_users to authenticated')
    expect(sql).not.toMatch(/grant (insert|update|delete|all).* to authenticated/)
  })

  it('enforces one client tenant per user', () => {
    expect(sql).toContain('constraint client_users_one_tenant_per_user unique (user_id)')
  })
})
