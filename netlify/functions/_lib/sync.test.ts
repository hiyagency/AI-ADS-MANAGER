import { describe, expect, it } from 'vitest'
import { settleWithConcurrency } from './sync.js'

describe('bounded synchronization dispatch', () => {
  it('never runs more tasks than the configured concurrency and preserves result order', async () => {
    let active = 0
    let maximumActive = 0
    const results = await settleWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await new Promise((resolve) => setTimeout(resolve, 2))
      active -= 1
      return value * 10
    })

    expect(maximumActive).toBe(2)
    expect(results).toEqual([10, 20, 30, 40, 50, 60].map((value) => ({ status: 'fulfilled', value })))
  })

  it('isolates one rejected task and continues dispatching the remaining work', async () => {
    const visited: number[] = []
    const results = await settleWithConcurrency([1, 2, 3], 2, async (value) => {
      visited.push(value)
      if (value === 2) throw new Error('isolated failure')
      return value
    })

    expect(visited.sort()).toEqual([1, 2, 3])
    expect(results[0]).toEqual({ status: 'fulfilled', value: 1 })
    expect(results[1]).toMatchObject({ status: 'rejected' })
    expect(results[2]).toEqual({ status: 'fulfilled', value: 3 })
  })

  it('rejects invalid concurrency before starting work', async () => {
    await expect(settleWithConcurrency([1], 0, async (value) => value)).rejects.toThrow('positive whole number')
  })
})
