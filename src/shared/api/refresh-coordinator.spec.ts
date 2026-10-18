import { describe, expect, it, vi } from 'vitest'

import { createRefreshCoordinator, isAppErrorOfKind } from './refresh-coordinator'
import type { AppError } from './api-error'

const authError = (): AppError => ({ kind: 'authentication', status: 401, message: 'Unauthorized' })

describe('refresh coordinator', () => {
  it('does not refresh when the call succeeds', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    const coordinator = createRefreshCoordinator({ refresh })
    await expect(coordinator.runWithAuthRetry(() => Promise.resolve('ok'), () => false)).resolves.toBe('ok')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('throws non-auth errors without refreshing', async () => {
    const refresh = vi.fn()
    const coordinator = createRefreshCoordinator({ refresh })
    const err = new Error('nope')
    await expect(
      coordinator.runWithAuthRetry(() => Promise.reject(err), () => false),
    ).rejects.toBe(err)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('refreshes once and retries on an auth error', async () => {
    const refresh = vi.fn().mockResolvedValue('newtoken')
    const onSuccess = vi.fn()
    const coordinator = createRefreshCoordinator({ refresh, onRefreshSuccess: onSuccess })
    let calls = 0
    const fn = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw authError()
      return 'data'
    })
    await expect(coordinator.runWithAuthRetry(fn, isAppErrorOfKind)).resolves.toBe('data')
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('newtoken')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('shares a single refresh across concurrent callers (single-flight)', async () => {
    const refresh = vi.fn().mockResolvedValue('t')
    const coordinator = createRefreshCoordinator({ refresh })

    const make = () =>
      coordinator.runWithAuthRetry(async () => {
        throw authError()
      }, isAppErrorOfKind)

    await expect(Promise.allSettled([make(), make(), make()])).resolves.toHaveLength(3)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('propagates the original error and notifies refresh failure when refresh fails', async () => {
    const refreshFail = new Error('refresh dead')
    const refresh = vi.fn().mockRejectedValue(refreshFail)
    const onFailure = vi.fn()
    const coordinator = createRefreshCoordinator({ refresh, onRefreshFailure: onFailure })
    await expect(
      coordinator.runWithAuthRetry(() => Promise.reject(authError()), isAppErrorOfKind),
    ).rejects.toMatchObject({ kind: 'authentication' })
    expect(onFailure).toHaveBeenCalledWith(refreshFail)
  })

  it('a transient refresh failure propagates the refresh error itself, not the stale 401', async () => {
    // Network/timeout/5xx/429 refresh failures keep the session (see the
    // teardown policy), so the caller must see the retryable refresh error —
    // surfacing the original 401 would make query clients treat it as terminal.
    for (const kind of ['network', 'timeout', 'server', 'rate-limit'] as const) {
      const refreshFail: AppError = {
        kind,
        status: kind === 'rate-limit' ? 429 : 503,
        message: `refresh ${kind}`,
      }
      const refresh = vi.fn().mockRejectedValue(refreshFail)
      const onFailure = vi.fn()
      const coordinator = createRefreshCoordinator({ refresh, onRefreshFailure: onFailure })
      await expect(
        coordinator.runWithAuthRetry(() => Promise.reject(authError()), isAppErrorOfKind),
      ).rejects.toBe(refreshFail)
      expect(onFailure).toHaveBeenCalledWith(refreshFail)
    }
  })

  it('an auth-verdict refresh failure still propagates the original request error', async () => {
    const refreshFail: AppError = { kind: 'authentication', status: 401, message: 'refresh expired' }
    const refresh = vi.fn().mockRejectedValue(refreshFail)
    const coordinator = createRefreshCoordinator({ refresh })
    const original = authError()
    await expect(
      coordinator.runWithAuthRetry(() => Promise.reject(original), isAppErrorOfKind),
    ).rejects.toBe(original)
  })

  it('a transient refresh failure reaches every concurrent caller (single-flight)', async () => {
    const refreshFail: AppError = { kind: 'network', message: 'refresh unreachable' }
    const refresh = vi.fn().mockRejectedValue(refreshFail)
    const onFailure = vi.fn()
    const coordinator = createRefreshCoordinator({ refresh, onRefreshFailure: onFailure })

    const make = () =>
      coordinator.runWithAuthRetry(async () => {
        throw authError()
      }, isAppErrorOfKind)

    const settled = await Promise.allSettled([make(), make(), make()])
    expect(refresh).toHaveBeenCalledTimes(1)
    // The failure hook is per-caller (pre-existing contract, idempotent for the
    // teardown policy); the refresh itself stays single-flight.
    expect(onFailure).toHaveBeenCalledTimes(3)
    expect(onFailure).toHaveBeenCalledWith(refreshFail)
    for (const outcome of settled) {
      expect(outcome.status).toBe('rejected')
      expect((outcome as PromiseRejectedResult).reason).toBe(refreshFail)
    }
  })
})

describe('isAppErrorOfKind', () => {
  it('recognizes authentication errors', () => {
    expect(isAppErrorOfKind(authError(), 'authentication')).toBe(true)
    expect(isAppErrorOfKind({ kind: 'authorization', message: 'x' }, 'authentication')).toBe(false)
    expect(isAppErrorOfKind(new Error('x'), 'authentication')).toBe(false)
  })
})
