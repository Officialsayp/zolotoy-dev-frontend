import { afterEach, describe, expect, it, vi } from 'vitest'

import { setHttpClientsForTest } from '@/app/providers/http-clients-instance'
import type { HttpClients } from '@/app/providers/http-clients'
import type { HttpClient, HttpRequestOptions } from '@/shared/api/http-client'

import { orderApi } from './order-api'
import type { CreateOrderRequestDto } from '../models/order-dto'

const IDEMPOTENCY_HEADER = 'Idempotency-Key'

/** Wraps a fake HttpClient that records every request delegate for assertions. */
function makeFake(impl: (options: HttpRequestOptions) => Promise<unknown>) {
  const calls: HttpRequestOptions[] = []
  const client = {
    request: vi.fn(async (options: HttpRequestOptions) => {
      calls.push(options)
      return impl(options)
    }),
  } as unknown as HttpClient
  const clients = {
    service: { order: client },
    health: {},
  } as unknown as HttpClients
  return { clients, calls }
}

describe('order API facade', () => {
  afterEach(() => {
    setHttpClientsForTest(undefined)
  })

  it('create order POSTs a body that never carries a total, plus an Idempotency-Key', async () => {
    const { clients, calls } = makeFake(async () => ({ id: 'x' }))
    setHttpClientsForTest(clients)

    const body: CreateOrderRequestDto = {
      buyer_id: 'buyer-1',
      payment_method: 'prepaid',
      delivery_address: 'Moscow',
      items: [
        { product_id: 'p1', name: 'Keyboard', quantity: 1, unit_price: 499000, currency: 'RUB' },
      ],
    }
    const result = await orderApi.createOrder(body, 'idem-1')

    expect(result).toEqual({ id: 'x' })
    expect(calls).toHaveLength(1)
    const call = calls[0]
    expect(call.method).toBe('POST')
    expect(call.path).toBe('/orders')
    // total is computed by the backend / mock store; the client must not send one.
    expect(call.body).not.toHaveProperty('total')
    expect((call.body as CreateOrderRequestDto).items).toHaveLength(1)
    expect(call.headers).toMatchObject({ [IDEMPOTENCY_HEADER]: 'idem-1' })
  })

  it('pay and cancel carry an Idempotency-Key; confirm/complete/request-cancellation do not', async () => {
    const { clients, calls } = makeFake(async () => ({}))
    setHttpClientsForTest(clients)

    await orderApi.payOrder('o1', 'idem-pay')
    await orderApi.cancelOrder('o1', 'idem-cancel')
    await orderApi.confirmOrder('o1')
    await orderApi.completeOrder('o1')
    await orderApi.requestCancellation('o1')

    expect(calls).toHaveLength(5)

    const pay = calls[0]
    expect(pay.path).toBe('/orders/o1/pay')
    expect(pay.method).toBe('POST')
    expect(pay.headers).toMatchObject({ [IDEMPOTENCY_HEADER]: 'idem-pay' })

    const cancel = calls[1]
    expect(cancel.path).toBe('/orders/o1/cancel')
    expect(cancel.headers).toMatchObject({ [IDEMPOTENCY_HEADER]: 'idem-cancel' })

    // Non-idempotent-by-source commands must not send the key at all.
    for (const call of calls.slice(2)) {
      expect(call.headers?.[IDEMPOTENCY_HEADER]).toBeUndefined()
    }
    expect(calls[2].path).toBe('/orders/o1/confirm')
    expect(calls[3].path).toBe('/orders/o1/complete')
    expect(calls[4].path).toBe('/orders/o1/request-cancellation')
  })

  it('URL-encodes order ids on the path', async () => {
    const { clients, calls } = makeFake(async () => ({}))
    setHttpClientsForTest(clients)

    await orderApi.getOrder('a b/c?d')

    expect(calls[0].method).toBeUndefined() // facade omits method for GET; transport defaults it
    expect(calls[0].path).toBe('/orders/a%20b%2Fc%3Fd')
  })

  it('list orders surfaces cursor and limit as query params', async () => {
    const { clients, calls } = makeFake(async () => ({ items: [], has_more: false, next_cursor: null }))
    setHttpClientsForTest(clients)

    await orderApi.listOrders({ cursor: 'abc', limit: 3 })

    expect(calls[0].method).toBeUndefined() // facade omits method for GET; transport defaults it
    expect(calls[0].path).toBe('/orders')
    expect(calls[0].query).toEqual({ cursor: 'abc', limit: 3 })
  })

  it('history request hits the dedicated endpoint', async () => {
    const { clients, calls } = makeFake(async () => [])
    setHttpClientsForTest(clients)

    await orderApi.getOrderHistory('o1')

    expect(calls[0].method).toBeUndefined() // facade omits method for GET; transport defaults it
    expect(calls[0].path).toBe('/orders/o1/history')
  })
})
