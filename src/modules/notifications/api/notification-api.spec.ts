import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { setHttpClientsForTest } from '@/app/providers/http-clients-instance'
import type { HttpClients } from '@/app/providers/http-clients'
import type { HttpClient, HttpRequestOptions } from '@/shared/api/http-client'

import {
  NOTIFICATION_QUERY_MAPPING,
  notificationApi,
  serializeNotificationQuery,
} from './notification-api'

/**
 * Facade routing + filter-serialization tests (Prompt 03 TESTS §filter
 * serialization). The facade is the single seam where PROPOSED query-parameter
 * names live, so swapping a future OpenAPI decision never touches UI.
 */

function makeFake() {
  const calls: HttpRequestOptions[] = []
  const client = {
    request: vi.fn(async <T>(options: HttpRequestOptions): Promise<T> => {
      calls.push(options)
      return {} as T
    }),
  } as unknown as HttpClient
  const clients = { service: { notification: client }, health: {} } as unknown as HttpClients
  return { clients, calls }
}

describe('notification api facade', () => {
  let calls: HttpRequestOptions[]

  beforeEach(() => {
    const { clients, calls: c } = makeFake()
    calls = c
    setHttpClientsForTest(clients)
  })

  afterEach(() => {
    setHttpClientsForTest(undefined)
  })

  it('routes to the source-backed endpoints with correct methods', async () => {
    await notificationApi.listNotifications()
    await notificationApi.getNotification('job-1')
    await notificationApi.retryNotification('job-1')
    await notificationApi.getEvent('event-9')

    expect(calls[0]).toMatchObject({ path: '/notifications', method: 'GET' })
    expect(calls[1]).toMatchObject({ path: '/notifications/job-1', method: 'GET' })
    expect(calls[2]).toMatchObject({ path: '/notifications/job-1/retry', method: 'POST' })
    expect(calls[3]).toMatchObject({ path: '/events/event-9', method: 'GET' })
  })

  it('serializes typed filters to the centralized PROPOSED param names', () => {
    const qs = serializeNotificationQuery({
      status: 'dead',
      channel: 'email',
      event_type: 'order.paid.v1',
      cursor: 'abc',
      limit: 25,
    })
    expect(qs).toEqual({
      status: 'dead',
      channel: 'email',
      event_type: 'order.paid.v1',
      cursor: 'abc',
      limit: 25,
    })
    // The param names live in exactly one place for a future OpenAPI change.
    expect(NOTIFICATION_QUERY_MAPPING.status.param).toBe('status')
    expect(NOTIFICATION_QUERY_MAPPING.channel.param).toBe('channel')
    expect(NOTIFICATION_QUERY_MAPPING.eventType.param).toBe('event_type')
    expect(NOTIFICATION_QUERY_MAPPING.cursor).toBe('cursor')
  })

  it('drops undefined and rejects values outside the source vocabulary', () => {
    // @ts-expect-error deliberately passing an invalid status value
    expect(serializeNotificationQuery({ status: 'failed' })).toEqual({})
    expect(serializeNotificationQuery({})).toEqual({})
    expect(serializeNotificationQuery({ limit: 0 })).toEqual({ limit: 0 })
  })

  it('passes serialized filters through to the http client', async () => {
    await notificationApi.listNotifications({ status: 'retry_wait', channel: 'telegram' })
    expect(calls[0].query).toEqual({ status: 'retry_wait', channel: 'telegram' })
  })
})
