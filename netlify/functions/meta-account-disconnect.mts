import type { Config } from '@netlify/functions'
import { json, requireAdmin, requirePost, respond } from './_lib/server.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async (request: Request) => respond(async () => {
  requirePost(request)
  const { admin } = await requireAdmin(request)
  const body = await request.json().catch(() => null) as { metaAccountId?: string } | null
  const metaAccountId = body?.metaAccountId?.trim() ?? ''
  if (!uuidPattern.test(metaAccountId)) return json({ error: 'Choose a valid Meta account mapping.' }, 400)
  const nowIso = new Date().toISOString()

  const { data, error } = await admin.from('meta_accounts').update({
    active: false,
    connection_status: 'disconnected',
    sync_locked_until: null,
    sync_lock_owner: null,
    last_error_summary: null,
  }).eq('id', metaAccountId).eq('active', true).or(`sync_locked_until.is.null,sync_locked_until.lt.${nowIso}`).select('id').maybeSingle()
  if (error) return json({ error: 'The Meta account mapping could not be disconnected.' }, 500)
  if (!data) return json({ error: 'The mapping is unavailable, already disconnected, or currently synchronizing.' }, 409)
  return json({ message: 'Meta account mapping disconnected. Historical reporting data was retained.' })
})

export const config: Config = { path: '/api/meta-account-disconnect' }
