import { describe, expect, it } from 'vitest'
import type { ClientMembership, ClientSummary, Profile } from '../types/database'
import { homeForRole, isPathAllowedForRole, messageForAuthError, resolveAccess, safeDestinationForRole } from './access'

const profile: Profile = {
  id: 'user-1',
  email: 'client@example.com',
  display_name: 'Client User',
  role: 'client',
  status: 'active',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}
const membership: ClientMembership = { user_id: 'user-1', client_id: 'client-1', created_at: '2026-09-01T00:00:00Z' }
const client: ClientSummary = {
  id: 'client-1',
  name: 'Example Client',
  slug: 'example-client',
  status: 'active',
  contact_name: null,
  contact_email: null,
  contact_phone: null,
  offer_id: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

describe('resolveAccess', () => {
  it('grants an active client with a live membership and client', () => {
    expect(resolveAccess(profile, membership, client)).toEqual({ kind: 'granted', profile, client })
  })

  it('grants an active admin without a client membership', () => {
    const admin = { ...profile, role: 'admin' as const }
    expect(resolveAccess(admin, null, null)).toEqual({ kind: 'granted', profile: admin, client: null })
  })

  it('denies disabled and unassigned users', () => {
    expect(resolveAccess({ ...profile, status: 'disabled' }, membership, client)).toEqual({ kind: 'denied', reason: 'profile_disabled' })
    expect(resolveAccess(profile, null, null)).toEqual({ kind: 'denied', reason: 'membership_missing' })
  })
})

describe('role routing', () => {
  it('keeps each role inside its own portal', () => {
    expect(homeForRole('admin')).toBe('/admin')
    expect(safeDestinationForRole('client', '/dashboard/campaigns')).toBe('/dashboard/campaigns')
    expect(safeDestinationForRole('client', '/admin')).toBe('/dashboard')
    expect(isPathAllowedForRole('admin', '//outside.example')).toBe(false)
  })
})

describe('auth errors', () => {
  it('uses safe, non-enumerating messages', () => {
    expect(messageForAuthError({ code: 'invalid_credentials' })).toBe('The email or password is incorrect.')
    expect(messageForAuthError({ status: 429 })).toContain('Too many')
  })
})
