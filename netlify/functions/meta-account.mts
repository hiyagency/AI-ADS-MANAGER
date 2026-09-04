import type { Config } from '@netlify/functions'
import { normalizeMetaAccountStatus } from '../../src/meta/normalizers.js'
import { fetchGraphObject } from './_lib/metaGraph.js'
import { json, requireAdmin, requirePost, respond } from './_lib/server.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type MetaAccountObject = {
  id?: string
  account_id?: string
  name?: string
  currency?: string
  timezone_name?: string
  account_status?: number | string
  business?: { name?: string }
}

export default async (request: Request) => respond(async () => {
  requirePost(request)
  const { admin } = await requireAdmin(request)
  const body = await request.json().catch(() => null) as {
    id?: string
    clientId?: string
    externalAccountId?: string
    name?: string
    timezoneName?: string
  } | null
  const id = body?.id?.trim()
  const clientId = body?.clientId?.trim() ?? ''
  const externalAccountId = body?.externalAccountId?.trim().replace(/^act_/, '') ?? ''
  if ((id && !uuidPattern.test(id)) || !uuidPattern.test(clientId)) return json({ error: 'Choose a valid client and account mapping.' }, 400)
  if (!/^\d+$/.test(externalAccountId)) return json({ error: 'Meta ad account ID must contain numbers only.' }, 400)

  const { data: client, error: clientError } = await admin.from('clients').select('id, status').eq('id', clientId).maybeSingle()
  if (clientError || !client) return json({ error: 'The selected client workspace does not exist.' }, 404)
  if (client.status !== 'active') return json({ error: 'Enable the client workspace before connecting Meta.' }, 409)

  const remote = await fetchGraphObject<MetaAccountObject>(`act_${externalAccountId}`, {
    fields: 'id,account_id,name,currency,timezone_name,account_status,business{name}',
  })
  const verifiedAccountId = remote.account_id ?? remote.id?.replace(/^act_/, '')
  if (verifiedAccountId !== externalAccountId) return json({ error: 'Meta returned a different ad account identity.' }, 502)

  const remoteStatus = normalizeMetaAccountStatus(remote.account_status)
  const isOperational = remoteStatus == null || remoteStatus === 1
  const verifiedAt = new Date().toISOString()
  const payload = {
    client_id: clientId,
    external_account_id: externalAccountId,
    name: (remote.name?.trim() || body?.name?.trim() || `Ad account ${externalAccountId}`).slice(0, 160),
    currency_code: /^[A-Z]{3}$/.test(remote.currency ?? '') ? remote.currency : 'INR',
    timezone_name: ((remote.timezone_name ?? body?.timezoneName?.trim()) || 'Asia/Kolkata').slice(0, 80),
    business_name: remote.business?.name?.trim().slice(0, 200) || null,
    remote_account_status: remoteStatus,
    last_verified_at: verifiedAt,
    connection_status: isOperational ? 'connected' as const : 'attention' as const,
    token_status: 'healthy' as const,
    last_error_summary: isOperational ? null : `Meta account status ${remoteStatus} requires attention.`,
    active: true,
  }
  const result = id
    ? await admin.from('meta_accounts').update(payload).eq('id', id).select('*').single()
    : await admin.from('meta_accounts').insert(payload).select('*').single()
  if (result.error) {
    return json({
      error: result.error.code === '23505'
        ? 'This Meta ad account is already mapped.'
        : 'The verified Meta account mapping could not be saved.',
    }, result.error.code === '23505' ? 409 : 500)
  }
  return json({
    message: `Meta account verified and ${id ? 'updated' : 'connected'}.`,
    account: result.data,
  }, id ? 200 : 201)
})

export const config: Config = { path: '/api/meta-account' }
