import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { notificationKeys } from './notification-query-keys'

const queryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  listNotifications: vi.fn(),
  getNotification: vi.fn(),
  retryNotification: vi.fn(),
  getEvent: vi.fn(),
}))

vi.mock('@tanstack/vue-query', () => ({
  useQuery: queryMocks.useQuery,
  useMutation: queryMocks.useMutation,
  useQueryClient: queryMocks.useQueryClient,
}))

vi.mock('../api/notification-api', () => ({ notificationApi: {
  listNotifications: queryMocks.listNotifications,
  getNotification: queryMocks.getNotification,
  retryNotification: queryMocks.retryNotification,
  getEvent: queryMocks.getEvent,
} }))

import {
  useNotificationDetailQuery,
  useNotificationsListQuery,
  useNotificationEventQuery,
  useRetryNotificationMutation,
} from './use-notification-queries'
import type { NotificationJobDetailDto } from '../models/notification-dto'

/**
 * Notification query composable wiring (Prompt 03 TESTS §polling active stops at
 * terminal, §keyset/keys). Verifies service-prefixed keys and that the detail
 * query's `refetchInterval` is driven by the centralized polling policy.
 */

const optionsByCall: unknown[] = []

function detailData(status: string): NotificationJobDetailDto {
  return {
    job: {
      id: 'j1',
      event_id: 'e1',
      event_type: 'order.paid.v1',
      channel: 'email',
      recipient: 'user@example.com',
      status: status as NotificationJobDetailDto['job']['status'],
      attempt_count: 1,
      created_at: '2026-09-02T12:00:00Z',
      updated_at: '2026-09-02T12:00:00Z',
    },
    attempts: [],
  }
}

beforeEach(() => {
  queryMocks.useQuery.mockReset()
  queryMocks.useMutation.mockReset()
  queryMocks.useQueryClient.mockReset()
  optionsByCall.length = 0
  queryMocks.useQuery.mockImplementation((options: unknown) => {
    optionsByCall.push(options)
    return {}
  })
})

describe('query keys', () => {
  it('builds service-prefixed keys for detail and list families', () => {
    useNotificationDetailQuery(ref('job-7'))
    const detailOptions = optionsByCall[0] as { queryKey: { value: unknown } }
    expect(detailOptions.queryKey.value).toEqual(notificationKeys.detail('job-7'))

    useNotificationsListQuery(ref({ status: 'dead', limit: 10 }))
    const listOptions = optionsByCall[1] as { queryKey: { value: unknown } }
    expect(listOptions.queryKey.value).toEqual(
      notificationKeys.list({ status: 'dead', limit: 10 }),
    )
  })

  it('keeps event queries under their own family', () => {
    useNotificationEventQuery(ref('evt-1'))
    const eventOptions = optionsByCall[0] as { queryKey: { value: unknown } }
    expect(eventOptions.queryKey.value).toEqual(notificationKeys.event('evt-1'))
  })
})

describe('detail polling wiring', () => {
  it('polls while the job is active and stops at a terminal status', () => {
    let options: { refetchInterval: (q: unknown) => number | undefined } = {
      refetchInterval: () => undefined,
    }
    queryMocks.useQuery.mockImplementation((o: typeof options) => {
      options = o
      return {}
    })

    useNotificationDetailQuery(ref('job-1'))

    const activeQuery = { state: { data: detailData('processing') } }
    expect(options.refetchInterval(activeQuery)).toBe(5000)

    const terminalQuery = { state: { data: detailData('dead') } }
    expect(options.refetchInterval(terminalQuery)).toBeUndefined()

    const sentQuery = { state: { data: detailData('sent') } }
    expect(options.refetchInterval(sentQuery)).toBeUndefined()
  })
})

describe('retry mutation invalidation', () => {
  it('invalidates detail, lists and event families on success (never the whole cache)', () => {
    const invalidateQueries = vi.fn()
    queryMocks.useQueryClient.mockReturnValue({ invalidateQueries })

    let mutationOptions: { onSuccess: (d: unknown, v: string) => void } | undefined
    queryMocks.useMutation.mockImplementation((o: typeof mutationOptions) => {
      mutationOptions = o
      return { isPending: { value: false }, mutateAsync: vi.fn() }
    })

    useRetryNotificationMutation()
    mutationOptions!.onSuccess?.({} as never, 'job-9')

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: notificationKeys.detail('job-9') })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: notificationKeys.lists() })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: notificationKeys.events() })
    // Not a blanket clear.
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['notifications'] })
  })
})
