import { requiredServerValue } from './server.js'

type GraphErrorShape = {
  message?: string
  type?: string
  code?: number
  error_subcode?: number
  is_transient?: boolean
  fbtrace_id?: string
}

type GraphPage<T> = { data?: T[]; paging?: { next?: string }; error?: GraphErrorShape }
type GraphObject<T> = T & { error?: GraphErrorShape }

export type MetaUsage = {
  app?: unknown
  adAccount?: unknown
  business?: unknown
}

export type MetaRequestMeta = {
  retries: number
  usage: MetaUsage
}

export type MetaCollectionResult<T> = MetaRequestMeta & {
  data: T[]
  pages: number
}

export type MetaTokenHealth = {
  status: 'healthy' | 'expiring' | 'expired' | 'revoked'
  expiresAt: string | null
  dataAccessExpiresAt: string | null
  scopes: string[]
  missingRequiredScopes: string[]
  appId: string | null
  tokenType: string | null
}

const RETRYABLE_CODES = new Set([1, 2, 4, 17, 32, 341, 613, 80004])
const REQUIRED_REPORTING_SCOPES = ['ads_read', 'business_management']
const MAX_RETRIES = 3
const MAX_PAGES = 50

export class MetaGraphError extends Error {
  code: number | null
  subcode: number | null
  status: number
  retryable: boolean
  traceId: string | null
  retries: number

  constructor(message: string, options: {
    code?: number
    subcode?: number
    status?: number
    transient?: boolean
    traceId?: string
    retries?: number
  } = {}) {
    super(message)
    this.name = 'MetaGraphError'
    this.code = options.code ?? null
    this.subcode = options.subcode ?? null
    this.status = options.status ?? 500
    this.retryable = isRetryableMetaFailure(this.status, this.code, options.transient)
    this.traceId = options.traceId ?? null
    this.retries = options.retries ?? 0
  }
}

export function isRetryableMetaFailure(status: number, code?: number | null, transient = false) {
  return transient || status === 429 || status >= 500 || (code != null && RETRYABLE_CODES.has(code))
}

export function metaRetryDelayMs(attempt: number, retryAfter?: string | null, random = Math.random()) {
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(30_000, Math.round(seconds * 1000))
    const retryDate = Date.parse(retryAfter)
    if (Number.isFinite(retryDate)) return Math.min(30_000, Math.max(0, retryDate - Date.now()))
  }
  const base = Math.min(8000, 750 * (2 ** Math.max(0, attempt)))
  return Math.round(base + (base * 0.2 * random))
}

function parsedHeader(headers: Headers, name: string) {
  const raw = headers.get(name)
  if (!raw || raw.length > 10_000) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

export function parseMetaUsage(headers: Headers): MetaUsage {
  return {
    app: parsedHeader(headers, 'x-app-usage'),
    adAccount: parsedHeader(headers, 'x-ad-account-usage'),
    business: parsedHeader(headers, 'x-business-use-case-usage'),
  }
}

function mergeUsage(current: MetaUsage, incoming: MetaUsage): MetaUsage {
  return {
    app: incoming.app ?? current.app,
    adAccount: incoming.adAccount ?? current.adAccount,
    business: incoming.business ?? current.business,
  }
}

function graphConfiguration() {
  const version = requiredServerValue('META_GRAPH_API_VERSION')
  if (!/^v\d+\.\d+$/.test(version)) throw new Error('META_GRAPH_API_VERSION must look like vXX.X.')
  return { version, accessToken: requiredServerValue('META_ACCESS_TOKEN') }
}

function graphUrl(version: string, path: string, parameters: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${version}/${path.replace(/^\//, '')}`)
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value))
  return url
}

function safePagingUrl(next: string) {
  const url = new URL(next)
  if (url.protocol !== 'https:' || url.hostname !== 'graph.facebook.com') {
    throw new MetaGraphError('Meta returned an invalid pagination address.', { status: 502 })
  }
  url.searchParams.delete('access_token')
  return url
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function graphRequest<T>(url: URL, accessToken: string): Promise<{ body: T; meta: MetaRequestMeta }> {
  let retries = 0
  let usage: MetaUsage = {}

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
      })
    } catch {
      if (attempt === MAX_RETRIES) {
        throw new MetaGraphError('The Meta Graph network request failed after retrying.', {
          status: 503,
          transient: true,
          retries,
        })
      }
      retries += 1
      await delay(metaRetryDelayMs(attempt))
      continue
    }
    usage = mergeUsage(usage, parseMetaUsage(response.headers))
    const body = await response.json().catch(() => ({})) as GraphObject<T>
    if (response.ok && !body.error) return { body: body as T, meta: { retries, usage } }

    const graphError = body.error
    const error = new MetaGraphError(
      graphError?.message?.slice(0, 400) || `Meta Graph request failed with status ${response.status}.`,
      {
        code: graphError?.code,
        subcode: graphError?.error_subcode,
        status: response.status,
        transient: graphError?.is_transient,
        traceId: graphError?.fbtrace_id,
        retries,
      },
    )
    if (!error.retryable || attempt === MAX_RETRIES) throw error

    retries += 1
    await delay(metaRetryDelayMs(attempt, response.headers.get('retry-after')))
  }

  throw new MetaGraphError('Meta Graph request exhausted its retry policy.', { retries })
}

export async function fetchGraphObjectWithMeta<T>(
  path: string,
  parameters: Record<string, string>,
  accessToken?: string,
) {
  const config = graphConfiguration()
  const request = await graphRequest<T>(graphUrl(config.version, path, parameters), accessToken ?? config.accessToken)
  return { data: request.body, ...request.meta }
}

export async function fetchGraphObject<T>(path: string, parameters: Record<string, string>) {
  return (await fetchGraphObjectWithMeta<T>(path, parameters)).data
}

export async function fetchGraphCollectionWithMeta<T>(
  path: string,
  parameters: Record<string, string>,
): Promise<MetaCollectionResult<T>> {
  const config = graphConfiguration()
  let url: URL | null = graphUrl(config.version, path, { ...parameters, limit: '250' })
  const data: T[] = []
  let pages = 0
  let retries = 0
  let usage: MetaUsage = {}

  while (url) {
    if (++pages > MAX_PAGES) throw new MetaGraphError(`Meta pagination exceeded the ${MAX_PAGES}-page safety limit.`)
    const response: { body: GraphPage<T>; meta: MetaRequestMeta } = await graphRequest<GraphPage<T>>(url, config.accessToken)
    data.push(...(response.body.data ?? []))
    retries += response.meta.retries
    usage = mergeUsage(usage, response.meta.usage)
    url = response.body.paging?.next ? safePagingUrl(response.body.paging.next) : null
  }

  return { data, pages, retries, usage }
}

export async function fetchGraphCollection<T>(path: string, parameters: Record<string, string>) {
  return (await fetchGraphCollectionWithMeta<T>(path, parameters)).data
}

type DebugTokenResponse = {
  data?: {
    app_id?: string
    type?: string
    is_valid?: boolean
    expires_at?: number
    data_access_expires_at?: number
    scopes?: string[]
  }
}

function unixTimestamp(value?: number) {
  return value && value > 0 ? new Date(value * 1000).toISOString() : null
}

export async function fetchMetaTokenHealth(now = Date.now()): Promise<MetaTokenHealth> {
  const config = graphConfiguration()
  const appAccessToken = requiredServerValue('META_APP_ACCESS_TOKEN')
  const response = await graphRequest<DebugTokenResponse>(
    graphUrl(config.version, 'debug_token', { input_token: config.accessToken }),
    appAccessToken,
  )
  const debug = response.body.data
  const expiresAt = unixTimestamp(debug?.expires_at)
  const dataAccessExpiresAt = unixTimestamp(debug?.data_access_expires_at)
  const scopes = [...new Set(debug?.scopes ?? [])].sort()
  const missingRequiredScopes = REQUIRED_REPORTING_SCOPES.filter((scope) => !scopes.includes(scope))
  const expirationTimes = [expiresAt, dataAccessExpiresAt].filter((value): value is string => value != null).map((value) => new Date(value).getTime())
  const effectiveExpiry = expirationTimes.length ? Math.min(...expirationTimes) : null
  const expiresSoon = effectiveExpiry != null && effectiveExpiry - now <= 14 * 24 * 60 * 60 * 1000
  const expired = effectiveExpiry != null && effectiveExpiry <= now

  return {
    status: !debug?.is_valid ? 'revoked' : expired ? 'expired' : expiresSoon ? 'expiring' : 'healthy',
    expiresAt,
    dataAccessExpiresAt,
    scopes,
    missingRequiredScopes,
    appId: debug?.app_id ?? null,
    tokenType: debug?.type ?? null,
  }
}
