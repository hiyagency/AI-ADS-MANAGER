import type { Config } from '@netlify/functions'
import { fetchMetaTokenHealth } from './_lib/metaGraph.js'
import { json, requireAdmin, requirePost, respond } from './_lib/server.js'

export default async (request: Request) => respond(async () => {
  requirePost(request)
  const { admin } = await requireAdmin(request)
  const health = await fetchMetaTokenHealth()
  const requiresAttention = health.status !== 'healthy' || health.missingRequiredScopes.length > 0
  const summary = health.missingRequiredScopes.length
    ? `Meta token is missing: ${health.missingRequiredScopes.join(', ')}.`
    : health.status === 'healthy'
      ? null
      : `Meta token status is ${health.status}.`

  const accountUpdate = {
    token_status: health.status,
    token_expires_at: health.expiresAt,
    credential_warning: summary,
    ...(requiresAttention ? {
      connection_status: 'attention' as const,
      last_error_summary: summary,
    } : {}),
  }
  const { error } = await admin.from('meta_accounts').update(accountUpdate).eq('active', true)
  if (error) return json({ error: 'Token health was checked but account statuses could not be updated.' }, 500)

  return json({ health })
})

export const config: Config = { path: '/api/meta-token-health' }
