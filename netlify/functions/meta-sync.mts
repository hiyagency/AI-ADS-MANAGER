import type { Config } from '@netlify/functions'
import { json, requireAdmin, requirePost, respond } from './_lib/server.js'
import { queueAccountSync } from './_lib/sync.js'

export default async (request: Request) => respond(async () => {
  requirePost(request)
  const { admin, profile } = await requireAdmin(request)
  const body = await request.json().catch(() => null) as { metaAccountId?: string } | null
  const metaAccountId = body?.metaAccountId?.trim()
  if (!metaAccountId) return json({ error: 'Choose a Meta account to synchronize.' }, 400)
  const queued = await queueAccountSync(admin, new URL(request.url).origin, metaAccountId, 'manual', profile.id)
  return json({ message: 'Synchronization queued.', ...queued }, 202)
})

export const config: Config = { path: '/api/meta-sync' }
