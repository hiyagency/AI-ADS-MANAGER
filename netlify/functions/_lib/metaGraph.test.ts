import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchGraphCollectionWithMeta, fetchMetaTokenHealth, isRetryableMetaFailure, metaRetryDelayMs, parseMetaUsage } from './metaGraph.js'

describe('Meta Graph transport policy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('retries throttling and transient platform failures only', () => {
    expect(isRetryableMetaFailure(429)).toBe(true)
    expect(isRetryableMetaFailure(400, 4)).toBe(true)
    expect(isRetryableMetaFailure(503)).toBe(true)
    expect(isRetryableMetaFailure(400, 190)).toBe(false)
  })

  it('honours Retry-After and bounds exponential jitter', () => {
    expect(metaRetryDelayMs(0, '2', 0)).toBe(2000)
    expect(metaRetryDelayMs(0, null, 0)).toBe(750)
    expect(metaRetryDelayMs(2, null, 1)).toBe(3600)
    expect(metaRetryDelayMs(8, '120', 0)).toBe(30000)
  })

  it('parses usage diagnostics without requiring any header', () => {
    const headers = new Headers({
      'x-app-usage': JSON.stringify({ call_count: 12 }),
      'x-ad-account-usage': JSON.stringify({ acc_id_util_pct: 5 }),
    })
    expect(parseMetaUsage(headers)).toEqual({
      app: { call_count: 12 },
      adAccount: { acc_id_util_pct: 5 },
      business: undefined,
    })
    expect(parseMetaUsage(new Headers())).toEqual({
      app: undefined,
      adAccount: undefined,
      business: undefined,
    })
  })

  it('follows trusted pagination without placing the credential in request URLs', async () => {
    vi.stubEnv('META_GRAPH_API_VERSION', 'v99.0')
    vi.stubEnv('META_ACCESS_TOKEN', 'server-secret')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ id: '1' }],
        paging: { next: 'https://graph.facebook.com/v99.0/me/adaccounts?after=cursor&access_token=server-secret' },
      }), { headers: { 'x-app-usage': JSON.stringify({ call_count: 4 }) } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: '2' }] })))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchGraphCollectionWithMeta<{ id: string }>('me/adaccounts', { fields: 'id' })

    expect(result).toMatchObject({ data: [{ id: '1' }, { id: '2' }], pages: 2, retries: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [url, options] of fetchMock.mock.calls) {
      expect(String(url)).not.toContain('access_token=')
      expect(options.headers.authorization).toBe('Bearer server-secret')
    }
  })

  it('derives token health from validity, expiry, and required scopes', async () => {
    const now = Date.parse('2026-09-04T00:00:00Z')
    vi.stubEnv('META_GRAPH_API_VERSION', 'v99.0')
    vi.stubEnv('META_ACCESS_TOKEN', 'reporting-token')
    vi.stubEnv('META_APP_ACCESS_TOKEN', 'app-token')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        app_id: '123',
        type: 'SYSTEM_USER',
        is_valid: true,
        expires_at: Math.floor((now + 7 * 24 * 60 * 60 * 1000) / 1000),
        scopes: ['ads_read'],
      },
    })))
    vi.stubGlobal('fetch', fetchMock)

    const health = await fetchMetaTokenHealth(now)

    expect(health.status).toBe('expiring')
    expect(health.missingRequiredScopes).toEqual(['business_management'])
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer app-token')
  })

  it('retries a throttled Graph page and reports the retry count', async () => {
    vi.stubEnv('META_GRAPH_API_VERSION', 'v99.0')
    vi.stubEnv('META_ACCESS_TOKEN', 'server-secret')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: 'Application request limit reached', code: 4 },
      }), { status: 429, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'ok' }] })))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchGraphCollectionWithMeta<{ id: string }>('me/adaccounts', { fields: 'id' })

    expect(result).toMatchObject({ data: [{ id: 'ok' }], retries: 1, pages: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
