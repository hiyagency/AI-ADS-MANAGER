import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '../../../src/types/database.js'

type AdminClient = SupabaseClient<Database>

export function optionalServerValue(name: string) {
  const netlifyValue = typeof Netlify === 'undefined' ? undefined : Netlify.env.get(name)
  return netlifyValue?.trim() || process.env[name]?.trim()
}

function required(name: string) {
  const value = optionalServerValue(name)
  if (!value) throw new Error(`Missing server environment variable: ${name}`)
  return value
}

export const requiredServerValue = required

export function serverEnvironment() {
  return {
    supabaseUrl: required('SUPABASE_URL'),
    publishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
    secretKey: optionalServerValue('SUPABASE_SECRET_KEY')
      || required('SUPABASE_SERVICE_ROLE_KEY'),
  }
}

export function adminClient(): AdminClient {
  const env = serverEnvironment()
  return createClient<Database>(env.supabaseUrl, env.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' },
  })
}

export function errorMessage(error: unknown, fallback = 'The server action failed.') {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function requirePost(request: Request) {
  if (request.method !== 'POST') throw new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405, headers: { allow: 'POST' } })
}

export async function requireAdmin(request: Request): Promise<{ profile: Profile; admin: AdminClient }> {
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new Response(JSON.stringify({ error: 'Authentication is required.' }), { status: 401 })

  const env = serverEnvironment()
  const userClient = createClient<Database>(env.supabaseUrl, env.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { authorization: `Bearer ${token}` } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData.user) throw new Response(JSON.stringify({ error: 'Your secure session is invalid or expired.' }), { status: 401 })

  const { data: profileData, error: profileError } = await userClient.from('profiles').select('*').eq('id', userData.user.id).maybeSingle()
  const profile = profileData as Profile | null
  if (profileError || !profile || profile.role !== 'admin' || profile.status !== 'active') {
    throw new Response(JSON.stringify({ error: 'Active HIY administrator access is required.' }), { status: 403 })
  }
  return { profile, admin: adminClient() }
}

export async function respond(handler: () => Promise<Response>) {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof Error && error.name === 'MetaGraphError') {
      const graphError = error as Error & { code?: number | null; status?: number; retryable?: boolean }
      const status = graphError.code === 190
        ? 401
        : graphError.status === 429 || graphError.retryable
          ? 429
          : 502
      return json({
        error: graphError.message,
        code: graphError.code ? `meta_${graphError.code}` : 'meta_request_failed',
        retryable: Boolean(graphError.retryable),
      }, status)
    }
    return json({ error: errorMessage(error) }, 500)
  }
}

export function dispatchSecret() {
  return required('SYNC_DISPATCH_SECRET')
}

export function assertInternalRequest(request: Request) {
  if (request.headers.get('x-hiy-sync-secret') !== dispatchSecret()) {
    throw new Response(JSON.stringify({ error: 'Invalid synchronization dispatcher.' }), { status: 401 })
  }
}
