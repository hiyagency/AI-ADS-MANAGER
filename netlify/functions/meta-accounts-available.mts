import type { Config } from '@netlify/functions'
import { normalizeMetaAccountStatus } from '../../src/meta/normalizers.js'
import { fetchGraphCollectionWithMeta } from './_lib/metaGraph.js'
import { json, requireAdmin, requirePost, respond } from './_lib/server.js'

type AvailableAccount = {
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
  await requireAdmin(request)
  const result = await fetchGraphCollectionWithMeta<AvailableAccount>('me/adaccounts', {
    fields: 'id,account_id,name,currency,timezone_name,account_status,business{name}',
  })

  const accounts = result.data.flatMap((account) => {
    const accountId = account.account_id ?? account.id?.replace(/^act_/, '')
    if (!accountId || !/^\d+$/.test(accountId)) return []
    return [{
      accountId,
      name: account.name?.trim() || `Ad account ${accountId}`,
      currencyCode: account.currency ?? 'INR',
      timezoneName: account.timezone_name ?? 'Asia/Kolkata',
      remoteStatus: normalizeMetaAccountStatus(account.account_status),
      businessName: account.business?.name?.trim() || null,
    }]
  }).sort((left, right) => left.name.localeCompare(right.name))

  return json({
    accounts,
    diagnostics: { pages: result.pages, retries: result.retries },
  })
})

export const config: Config = { path: '/api/meta-accounts-available' }
