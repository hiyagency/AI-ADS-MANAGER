import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { ClientSummary, Profile } from '../types/database'
import type { AccessDeniedReason, AuthStatus } from './access'

export type AuthActionResult = { error: string | null }

export type AuthContextValue = {
  status: AuthStatus
  session: Session | null
  user: User | null
  profile: Profile | null
  client: ClientSummary | null
  deniedReason: AccessDeniedReason | null
  error: string | null
  signIn: (email: string, password: string) => Promise<AuthActionResult>
  signOut: () => Promise<AuthActionResult>
  retryAccess: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
