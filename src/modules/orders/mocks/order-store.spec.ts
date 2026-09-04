import { afterEach, describe, expect, it } from 'vitest'

import { resetScenario, setScenario } from '@/mocks/scenario-registry'

import type { CreateOrderRequestDto } from '../models/order-dto'
import {
  ORDER_COMPLETED,
  ORDER_CONFLICT,
  ORDER_PAYMENT_FAILED,
  ORDER_RECEIPT_UNPAID,
} from './order-fixtures'
import {
  createOrderRouter,
  decodeOrderCursor,
  encodeOrderCursor,
  OrderMockError,
  resetOrderMockState,
  type OrderStoreAPI,
} from './order-store'

function router(): OrderStoreAPI {
  return createOrderRouter()
}

const createBody: CreateOrderRequestDto = {
  buyer_id: '11111111-1111-4111-8111-111111111111',
  payment_method: 'prepaid',
  delivery_address: 'Moscow, Test st 1',
  items: [
    { product_id: 'p1', name: 'Keyboard', quantity: 2, unit_price: 499000, currency: 'RUB' },
  ],
}

describe('Order mock store', () => {
  afterEach(() => {
    resetOrderMockState()
    resetScenario()
  })

  it('default scenario lists all orders newest-first with keyset pagination', () => {
    const api = router()
    const page1 = api.list(undefined, 3)
    expect(page1.items).toHaveLength(3)
    expect(page1.has_more).toBe(true)
    expect(page1.next_cursor).toBeTruthy()

    const { createdAt, id } = decodeOrderCursor(page1.next_cursor as string)
    const page2 = api.list(encodeOrderCursor(createdAt, id), 20)
    expect(page2.has_more).toBe(false)
    // no overlap between pages
    const ids1 = page1.items.map((o) => o.id)
    const ids2 = page2.items.map((o) => o.id)
    expect(ids1.filter((x) => ids2.includes(x))).toHaveLength(0)
  })

  it('pay on receipt transitions awaiting -> paid, bumps version and appends history', () => {
    const api = router()
    const before = api.get(ORDER_RECEIPT_UNPAID)
    expect(before.payment_status).toBe('awaiting')

    const paid = api.pay(ORDER_RECEIPT_UNPAID, 'idem-pay-1')
    expect(paid.payment_status).toBe('paid')
    expect(paid.version).toBe(before.version + 2) // processing -> paid, two bumps
    expect(api.get(ORDER_RECEIPT_UNPAID).payment_status).toBe('paid')

    const history = api.getHistory(ORDER_RECEIPT_UNPAID)
    const operations = history.map((h) => h.operation)
    expect(operations).toContain('order.payment_started')
    expect(operations).toContain('order.paid')
  })

  it('pay is rejected when the order is already paid', () => {
    const api = router()
    api.pay(ORDER_RECEIPT_UNPAID, 'idem-pay-1')
    expect(() => api.pay(ORDER_RECEIPT_UNPAID, 'idem-pay-2')).toThrowError(
      'Order is already paid.',
    )
  })

  it('idempotency replay returns the stored result with no re-transition', () => {
    setScenario('orders-idempotency-replay')
    const api = router()
    const first = api.pay(ORDER_RECEIPT_UNPAID, 'idem-replay')
    const second = api.pay(ORDER_RECEIPT_UNPAID, 'idem-replay')
    expect(second.id).toBe(first.id)
    expect(second.version).toBe(first.version)
    // exactly one payment transition happened despite two calls
    const started = api.getHistory(ORDER_RECEIPT_UNPAID).filter(
      (h) => h.operation === 'order.payment_started',
    )
    expect(started).toHaveLength(1)
  })

  it('idempotency-conflict scenario rejects an arbitrary UI-generated key with 409', () => {
    setScenario('orders-idempotency-conflict')
    const api = router()
    const generatedKey = '5f9a5a12-a130-44d0-9a39-bebd1f78a7cf'

    expect(() => api.pay(ORDER_RECEIPT_UNPAID, generatedKey)).toThrowError(OrderMockError)

    try {
      api.pay(ORDER_RECEIPT_UNPAID, generatedKey)
    } catch (error) {
      const e = error as OrderMockError
      expect(e.status).toBe(409)
      expect(e.code).toBe('ORDER_IDEMPOTENCY_CONFLICT')
    }
  })

  it('version conflict scenario rejects a stale mutation and bumps the server version', () => {
    setScenario('orders-version-conflict')
    const api = router()
    const before = api.get(ORDER_CONFLICT)
    try {
      api.pay(ORDER_CONFLICT, 'idem-conflict-1')
      throw new Error('expected an ORDER_VERSION_CONFLICT error')
    } catch (error) {
      const e = error as OrderMockError
      expect(e.status).toBe(409)
      expect(e.code).toBe('ORDER_VERSION_CONFLICT')
    }
    expect(api.get(ORDER_CONFLICT).version).toBe(before.version + 1)
  })

  it('forbidden scenario rejects reads with 403', () => {
    setScenario('orders-forbidden')
    const api = router()
    try {
      api.list()
      throw new Error('expected a forbidden error')
    } catch (error) {
      const e = error as OrderMockError
      expect(e.status).toBe(403)
      expect(e.code).toBe('ORDER_FORBIDDEN')
    }
  })

  it('rate-limited scenario rejects writes with 429', () => {
    setScenario('orders-rate-limited')
    const api = router()
    try {
      api.create(createBody, 'idem-create-rl')
      throw new Error('expected a rate-limit error')
    } catch (error) {
      const e = error as OrderMockError
      expect(e.status).toBe(429)
      expect(e.code).toBe('ORDER_RATE_LIMITED')
    }
  })

  it('empty scenario lists no orders', () => {
    setScenario('orders-empty')
    const api = router()
    const page = api.list(undefined, 20)
    expect(page.items).toHaveLength(0)
    expect(page.has_more).toBe(false)
    expect(page.next_cursor).toBeNull()
  })

  it('an already-created router follows scenario switches instead of holding a stale store', () => {
    const api = router()
    expect(api.list(undefined, 20).items.length).toBeGreaterThan(0)

    setScenario('orders-empty')

    const page = api.list(undefined, 20)
    expect(page.items).toHaveLength(0)
    expect(page.has_more).toBe(false)
  })

  it('create computes the server total and returns a version-1 order', () => {
    const api = router()
    const created = api.create(createBody, 'idem-create-1')
    expect(created.status).toBe('created')
    expect(created.payment_status).toBe('awaiting')
    expect(created.version).toBe(1)
    // 2 * 499000 = 998000 minor units
    expect(created.total.amount).toBe(998000)
    expect(created.items[0].total_price).toBe(998000)
    expect(api.get(created.id).id).toBe(created.id)
  })

  it('rejects unsupported currency instead of silently summing it as RUB', () => {
    const api = router()
    const usdBody: CreateOrderRequestDto = {
      ...createBody,
      items: [
        {
          ...createBody.items[0],
          currency: 'USD',
        },
      ],
    }

    try {
      api.create(usdBody, 'idem-create-usd')
      throw new Error('expected a currency validation error')
    } catch (error) {
      const e = error as OrderMockError
      expect(e.status).toBe(400)
      expect(e.code).toBe('ORDER_VALIDATION')
      expect(e.message).toContain('RUB')
    }
  })

  it('completed order exposes a terminal order', () => {
    const api = router()
    const done = api.get(ORDER_COMPLETED)
    expect(done.status).toBe('completed')
    expect(done.payment_status).toBe('paid')
    // no further mutation actions available against a completed order
    expect(() => api.pay(ORDER_COMPLETED, 'k')).toThrowError(
      OrderMockError,
    )
  })

  it('returns history-only entries for the failed-payment order', () => {
    const api = router()
    const failed = api.get(ORDER_PAYMENT_FAILED)
    expect(failed.payment_status).toBe('failed')
    // A failed payable order can still be retried by paying again.
    const paid = api.pay(ORDER_PAYMENT_FAILED, 'idem-retry')
    expect(paid.payment_status).toBe('paid')
  })
})
