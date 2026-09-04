import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SyncTrigger } from '../../../src/types/database.js'
import { dispatchSecret } from './server.js'

export async function settleWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('Synchronization concurrency must be a positive whole number.')
  }

  const results = new Array<PromiseSettledResult<R>>(items.length)
  let nextIndex = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index], index) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  })
  await Promise.all(runners)
  return results
}

export async function queueAccountSync(
  admin: SupabaseClient<Database>,
  origin: string,
  metaAccountId: string,
  triggerSource: SyncTrigger,
  requestedBy: string | null,
) {
  const requestId = crypto.randomUUID()
  const { data: account, error: accountError } = await admin.from('meta_accounts').select('id, client_id, active').eq('id', metaAccountId).maybeSingle()
  if (accountError || !account || !account.active) throw new Error('The Meta account mapping is unavailable.')

  const { data: log, error: logError } = await admin.from('sync_logs').insert({
    client_id: account.client_id,
    meta_account_id: account.id,
    status: 'queued',
    trigger_source: triggerSource,
    requested_by: requestedBy,
    request_id: requestId,
    started_at: null,
    completed_at: null,
    records_synced: 0,
    attempt: 1,
    message: 'Synchronization queued.',
    error_code: null,
    cursor: null,
  }).select('*').single()
  if (logError || !log) throw new Error('The synchronization log could not be created.')

  const response = await fetch(new URL('/api/meta-sync-worker', origin), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hiy-sync-secret': dispatchSecret() },
    body: JSON.stringify({ metaAccountId: account.id, syncLogId: log.id }),
  })
  if (!response.ok) {
    const { error: failureLogError } = await admin.from('sync_logs').update({ status: 'failed', completed_at: new Date().toISOString(), message: 'The background worker could not be dispatched.', error_code: 'dispatch_failed' }).eq('id', log.id)
    if (failureLogError) throw new Error('The worker dispatch and its failure log both failed.')
    throw new Error('The synchronization worker could not be dispatched.')
  }
  return { requestId, syncLogId: log.id }
}
