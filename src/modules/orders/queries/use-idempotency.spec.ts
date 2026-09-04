import { describe, expect, it, vi } from 'vitest'

import { canonicalPayload, newIdempotencyKey, useIdempotency } from './use-idempotency'

describe('useIdempotency lifecycle', () => {
  it('canonicalPayload and key generation are stable and unique', () => {
    expect(canonicalPayload({ a: 1 })).toBe(JSON.stringify({ a: 1 }))
    expect(canonicalPayload({ a: 2 })).not.toBe(canonicalPayload({ a: 1 }))
    // Object key order is made consistent by JSON.stringify -> same object literal stays identical.
    expect(canonicalPayload({ a: 1, b: 2 })).toBe(canonicalPayload({ a: 1, b: 2 }))

    const key1 = newIdempotencyKey()
    const key2 = newIdempotencyKey()
    expect(key1).toBeTruthy()
    expect(key2).toBeTruthy()
    expect(key1).not.toBe(key2)
  })

  it('reuses the same key for an unchanged-payload retry of an unresolved attempt', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'fixed-uuid'),
    })
    try {
      const idem = useIdempotency()
      const first = idem.begin({ items: [1] })
      // Same logical attempt, same payload -> key preserved.
      const retry = idem.begin({ items: [1] })
      expect(retry).toBe(first)
      expect(first).toBe('fixed-uuid')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('issues a fresh key when the payload changes on an unresolved attempt', () => {
    const idem = useIdempotency()
    const first = idem.begin({ items: [1] })
    const changed = idem.begin({ items: [2] })
    expect(changed).not.toBe(first)
  })

  it('issues a fresh key after a definitive response', () => {
    const idem = useIdempotency()
    const first = idem.begin({})
    idem.resolveOutcome()
    const second = idem.begin({})
    expect(second).not.toBe(first)
  })

  it('resolves the attempt by clearing key, payload and resolved flag future state', () => {
    const idem = useIdempotency()
    idem.begin({})
    expect(idem.resolved.value).toBe(false)
    expect(idem.currentKey.value).toBeTruthy()
    idem.resolveOutcome()
    expect(idem.resolved.value).toBe(true)
    expect(idem.currentKey.value).toBeNull()
    expect(idem.pinnedPayload.value).toBeNull()
  })

  it('begin() returns a brand new key on a fresh controller', () => {
    const a = useIdempotency()
    const b = useIdempotency()
    expect(a.begin({})).not.toBe(b.begin({}))
  })
})
