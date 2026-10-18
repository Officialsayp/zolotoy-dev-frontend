import { describe, expect, it } from 'vitest'

import { createQueryClient } from './query-client'

/**
 * Caller-behavior contract of the shared retry policy (review finding #2):
 * errors a caller receives must classify correctly — transient infrastructure
 * kinds auto-retry a bounded number of times, user/domain kinds (including a
 * stale 401 and 429) never do. This is what makes the refresh coordinator's
 * transient-error propagation observable to queries.
 */

function failingQueryFn(error: unknown, attempts: { count: number }): () => Promise<never> {
  return async () => {
    attempts.count += 1
    throw error
  }
}

describe('query client retry classification', () => {
  it('auto-retries transient errors a bounded number of times (initial + 2)', async () => {
    const client = createQueryClient()
    const attempts = { count: 0 }
    await expect(
      client.fetchQuery({
        queryKey: ['retry', 'network'],
        queryFn: failingQueryFn({ kind: 'network', message: 'blip' }, attempts),
      }),
    ).rejects.toMatchObject({ kind: 'network' })
    expect(attempts.count).toBe(3)
  })

  it('never auto-retries authentication errors (a 401 stays terminal)', async () => {
    const client = createQueryClient()
    const attempts = { count: 0 }
    await expect(
      client.fetchQuery({
        queryKey: ['retry', 'authentication'],
        queryFn: failingQueryFn({ kind: 'authentication', status: 401, message: 'x' }, attempts),
      }),
    ).rejects.toMatchObject({ kind: 'authentication' })
    expect(attempts.count).toBe(1)
  })

  it('never auto-retries rate-limit errors (429 keeps its no-auto-retry policy)', async () => {
    const client = createQueryClient()
    const attempts = { count: 0 }
    await expect(
      client.fetchQuery({
        queryKey: ['retry', 'rate-limit'],
        queryFn: failingQueryFn({ kind: 'rate-limit', status: 429, message: 'x' }, attempts),
      }),
    ).rejects.toMatchObject({ kind: 'rate-limit' })
    expect(attempts.count).toBe(1)
  })
})
