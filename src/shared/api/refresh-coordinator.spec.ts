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
})

describe('isAppErrorOfKind', () => {
  it('recognizes authentication errors', () => {
    expect(isAppErrorOfKind(authError(), 'authentication')).toBe(true)
    expect(isAppErrorOfKind({ kind: 'authorization', message: 'x' }, 'authentication')).toBe(false)
    expect(isAppErrorOfKind(new Error('x'), 'authentication')).toBe(false)
  })
})
