import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase, supabaseConfiguration } from '../lib/supabase'
import type { ClientMembership, ClientSummary, Profile } from '../types/database'
import {
  messageForAuthError,
  resolveAccess,
  type AccessDeniedReason,
  type AuthStatus,
} from './access'
import { AuthContext, type AuthActionResult, type AuthContextValue } from './context'

type AuthState = {
  status: AuthStatus
  session: Session | null
  profile: Profile | null
  client: ClientSummary | null
  deniedReason: AccessDeniedReason | null
  error: string | null
}

const initialState: AuthState = {
  status: supabaseConfiguration.configured ? 'loading' : 'misconfigured',
  session: null,
  profile: null,
  client: null,
  deniedReason: null,
  error: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)
  const mountedRef = useRef(false)
  const requestRef = useRef(0)
  const sessionRef = useRef<Session | null>(null)

  const commit = useCallback((requestId: number, nextState: AuthState) => {
    if (mountedRef.current && requestRef.current === requestId) setState(nextState)
  }, [])

  const hydrateAccess = useCallback(async (session: Session, showLoading = true) => {
    if (!supabase) return

    const requestId = ++requestRef.current
    sessionRef.current = session
    if (showLoading) {
      setState({
        status: 'resolving',
        session,
        profile: null,
        client: null,
        deniedReason: null,
        error: null,
      })
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, status, created_at, updated_at')
      .eq('id', session.user.id)
      .maybeSingle()

    if (profileError) {
      commit(requestId, {
        status: 'error',
        session,
        profile: null,
        client: null,
        deniedReason: null,
        error: 'We could not verify your account access. Check your connection and try again.',
      })
      return
    }

    const profile = profileData as Profile | null
    if (!profile || profile.status !== 'active' || profile.role === 'admin') {
      const resolution = resolveAccess(profile, null, null)
      commit(requestId, resolution.kind === 'granted'
        ? {
            status: 'authenticated',
            session,
            profile: resolution.profile,
            client: resolution.client,
            deniedReason: null,
            error: null,
          }
        : {
            status: 'denied',
            session,
            profile,
            client: null,
            deniedReason: resolution.reason,
            error: null,
          })
      return
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('client_users')
      .select('user_id, client_id, created_at')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (membershipError) {
      commit(requestId, {
        status: 'error',
        session,
        profile,
        client: null,
        deniedReason: null,
        error: 'We could not verify your client assignment. Try again in a moment.',
      })
      return
    }

    const membership = membershipData as ClientMembership | null
    let client: ClientSummary | null = null

    if (membership) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, slug, status, contact_name, contact_email, contact_phone, offer_id, created_at, updated_at')
        .eq('id', membership.client_id)
        .maybeSingle()

      if (clientError) {
        commit(requestId, {
          status: 'error',
          session,
          profile,
          client: null,
          deniedReason: null,
          error: 'We could not open your client workspace. Try again in a moment.',
        })
        return
      }
      client = clientData as ClientSummary | null
    }

    const resolution = resolveAccess(profile, membership, client)
    commit(requestId, resolution.kind === 'granted'
      ? {
          status: 'authenticated',
          session,
          profile: resolution.profile,
          client: resolution.client,
          deniedReason: null,
          error: null,
        }
      : {
          status: 'denied',
          session,
          profile,
          client: null,
          deniedReason: resolution.reason,
          error: null,
        })
  }, [commit])

  useEffect(() => {
    mountedRef.current = true
    if (!supabase) return () => { mountedRef.current = false }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      sessionRef.current = session
      if (!session) {
        const requestId = ++requestRef.current
        commit(requestId, {
          status: 'anonymous',
          session: null,
          profile: null,
          client: null,
          deniedReason: null,
          error: null,
        })
        return
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const showLoading = event !== 'TOKEN_REFRESHED'
        queueMicrotask(() => {
          if (mountedRef.current) void hydrateAccess(session, showLoading)
        })
      }
    })

    return () => {
      mountedRef.current = false
      requestRef.current += 1
      subscription.unsubscribe()
    }
  }, [commit, hydrateAccess])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!supabase) return { error: 'Client access is not configured in this environment.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? messageForAuthError(error) : null }
  }, [])

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!supabase) return { error: null }
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) return { error: 'We could not sign you out. Check your connection and try again.' }

    sessionRef.current = null
    const requestId = ++requestRef.current
    commit(requestId, {
      status: 'anonymous',
      session: null,
      profile: null,
      client: null,
      deniedReason: null,
      error: null,
    })
    return { error: null }
  }, [commit])

  const retryAccess = useCallback(async () => {
    if (!supabase) return
    if (sessionRef.current) {
      await hydrateAccess(sessionRef.current)
      return
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      const requestId = ++requestRef.current
      commit(requestId, {
        status: 'error',
        session: null,
        profile: null,
        client: null,
        deniedReason: null,
        error: 'We could not restore your secure session. Try signing in again.',
      })
    } else if (data.session) {
      await hydrateAccess(data.session)
    } else {
      const requestId = ++requestRef.current
      commit(requestId, {
        status: 'anonymous',
        session: null,
        profile: null,
        client: null,
        deniedReason: null,
        error: null,
      })
    }
  }, [commit, hydrateAccess])

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    user: state.session?.user ?? null,
    signIn,
    signOut,
    retryAccess,
  }), [state, signIn, signOut, retryAccess])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
