import type { Config } from '@netlify/functions'
import { adminClient, errorMessage, optionalServerValue } from './_lib/server.js'
import { queueAccountSync, settleWithConcurrency } from './_lib/sync.js'

const ACCOUNT_PAGE_SIZE = 100
const DISPATCH_CONCURRENCY = 8

export default async (request: Request) => {
  if (optionalServerValue('META_SYNC_ENABLED') !== 'true') {
    console.info('Scheduled Meta synchronization is disabled until production credentials are verified.')
    return
  }

  const admin = adminClient()
  const origin = new URL(request.url).origin
  const failures: string[] = []
  let cursor: string | null = null
  let dispatched = 0

  while (true) {
    let query = admin.from('meta_accounts')
      .select('id')
      .eq('active', true)
      .order('id', { ascending: true })
      .limit(ACCOUNT_PAGE_SIZE)
    if (cursor) query = query.gt('id', cursor)

    const { data: accounts, error } = await query
    if (error) throw new Error('Active Meta accounts could not be loaded for scheduled synchronization.')
    const page = accounts ?? []
    const results = await settleWithConcurrency(
      page,
      DISPATCH_CONCURRENCY,
      (account) => queueAccountSync(admin, origin, account.id, 'scheduled', null),
    )
    dispatched += results.filter((result) => result.status === 'fulfilled').length
    failures.push(...results.flatMap((result) => result.status === 'rejected' ? [errorMessage(result.reason)] : []))

    if (page.length < ACCOUNT_PAGE_SIZE) break
    cursor = page.at(-1)?.id ?? null
    if (!cursor) break
  }

  if (failures.length) console.error('Scheduled sync dispatch failures:', failures.slice(0, 20))
  console.info(`Scheduled Meta synchronization dispatched ${dispatched} account job(s); ${failures.length} dispatch(es) failed.`)
}

export const config: Config = { schedule: '0 */6 * * *' }
