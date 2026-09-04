import type { AppRole, ClientMembership, ClientSummary, Profile } from '../types/database'

export type AuthStatus =
  | 'loading'
  | 'anonymous'
  | 'resolving'
  | 'authenticated'
  | 'denied'
  | 'error'
  | 'misconfigured'

export type AccessDeniedReason =
  | 'profile_missing'
  | 'profile_disabled'
  | 'membership_missing'
  | 'client_unavailable'
  | 'client_disabled'

export type AccessResolution =
  | { kind: 'granted'; profile: Profile; client: ClientSummary | null }
  | { kind: 'denied'; reason: AccessDeniedReason }

export function resolveAccess(
  profile: Profile | null,
  membership: ClientMembership | null,
  client: ClientSummary | null,
): AccessResolution {
  if (!profile) return { kind: 'denied', reason: 'profile_missing' }
  if (profile.status !== 'active') return { kind: 'denied', reason: 'profile_disabled' }
  if (profile.role === 'admin') return { kind: 'granted', profile, client: null }
  if (!membership) return { kind: 'denied', reason: 'membership_missing' }
  if (!client) return { kind: 'denied', reason: 'client_unavailable' }
  if (client.status !== 'active') return { kind: 'denied', reason: 'client_disabled' }
  return { kind: 'granted', profile, client }
}

export function homeForRole(role: AppRole) {
  return role === 'admin' ? '/admin' : '/dashboard'
}

export function isPathAllowedForRole(role: AppRole, path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return false
  const base = homeForRole(role)
  return path === base || path.startsWith(`${base}/`)
}

export function safeDestinationForRole(role: AppRole, requestedPath?: string) {
  return requestedPath && isPathAllowedForRole(role, requestedPath)
    ? requestedPath
    : homeForRole(role)
}

type AuthErrorLike = { code?: string; status?: number }

export function messageForAuthError(error: AuthErrorLike) {
  if (error.code === 'invalid_credentials') return 'The email or password is incorrect.'
  if (error.code === 'email_not_confirmed') return 'This account is not ready yet. Contact HIY AGENCY for access.'
  if (error.code === 'user_banned') return 'This account is unavailable. Contact HIY AGENCY for assistance.'
  if (error.status === 429 || error.code === 'over_request_rate_limit') return 'Too many login attempts. Wait a moment and try again.'
  return 'We could not sign you in right now. Check your connection and try again.'
}

export function messageForDeniedAccess(reason: AccessDeniedReason | null) {
  if (reason === 'profile_disabled') return 'This account has been disabled by HIY AGENCY.'
  if (reason === 'client_disabled' || reason === 'client_unavailable') return 'This client workspace is currently unavailable.'
  return 'Your client access has not been fully configured yet.'
}
