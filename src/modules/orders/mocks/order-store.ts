/**
 * Deterministic in-memory Order mock store (MASTER_FRONTEND_PLAN §10, §19.3).
 *
 * Simulates the Order backend for MOCK mode: validates domain transitions like
 * the backend invariants, performs idempotent command replay/conflict, keyset
 * pagination and optimistic locking. It is rebuilt from immutable fixture
 * sources whenever the demo scenario changes, and mutated in place during a
 * session so demos can progress; reset/switch restores the exact baseline.
 */

import { getScenario, type DemoScenarioId } from '@/mocks/scenario-registry'

import type {
  CreateOrderRequestDto,
  OrderDto,
  OrderHistoryEntryDto,
} from '../models/order-dto'
import {
  buildOrderFixtures,
  FOREIGN_BUYER_ID,
  ORDER_CONFLICT,
  ORDER_PAYMENT_FAILED,
  ORDER_PREPAID_AWAITING,
  ORDER_PREPAID_PAID,
  ORDER_RECEIPT_UNPAID,
} from './order-fixtures'

type ScenarioConfig = DemoScenarioId

export interface IdempotencyRecord {
  operation: string
  requestHash: string
  status: number
  body: unknown
}

interface OrderStore {
  orders: Map<string, OrderDto>
  history: Map<string, OrderHistoryEntryDto[]>
  idempotency: Map<string, IdempotencyRecord>
  readsForbidden: boolean
  writesRateLimited: boolean
  nextNewSequence: number
}

export class OrderMockError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'OrderMockError'
    this.status = status
    this.code = code
  }
}

const SCENARIO_IDS_TO_SEED: Partial<Record<ScenarioConfig, string[]>> = {
  default: [
    ORDER_RECEIPT_UNPAID,
    ORDER_PREPAID_AWAITING,
    ORDER_PAYMENT_FAILED,
    '10000000-0000-4000-8000-000000000004', // completed
    '10000000-0000-4000-8000-000000000005', // cancel requested
    ORDER_CONFLICT,
    ORDER_PREPAID_PAID,
  ],
  'orders-happy-pay-on-receipt': [
    ORDER_RECEIPT_UNPAID,
    '10000000-0000-4000-8000-000000000004',
  ],
  'orders-prepaid': [ORDER_PREPAID_AWAITING, ORDER_PREPAID_PAID],
  'orders-payment-failed-retry': [ORDER_PAYMENT_FAILED, ORDER_RECEIPT_UNPAID],
  'orders-version-conflict': [ORDER_CONFLICT],
  'orders-idempotency-replay': [ORDER_RECEIPT_UNPAID],
  'orders-idempotency-conflict': [ORDER_RECEIPT_UNPAID],
  'orders-empty': [],
}

const FIXTURE_BY_ID = new Map(
  buildOrderFixtures().map((bundle) => [bundle.order.id, bundle]),
)

function encode64(value: string): string {
  if (typeof btoa === 'function') return btoa(value)
  return Buffer.from(value, 'utf-8').toString('base64')
}

function decode64(value: string): string {
  if (typeof atob === 'function') return atob(value)
  return Buffer.from(value, 'base64').toString('utf-8')
}

export function encodeOrderCursor(createdAt: string, id: string): string {
  return encode64(`${createdAt}|${id}`)
}

export function decodeOrderCursor(cursor: string): { createdAt: string; id: string } {
  const [createdAt, id] = decode64(cursor).split('|')
  return { createdAt, id }
}

function requestHash(body: unknown): string {
  try {
    return JSON.stringify(body)
  } catch {
    return String(body)
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function isPayableMethod(paymentMethod: OrderDto['payment_method']): boolean {
  return paymentMethod === 'prepaid' || paymentMethod === 'pay_on_receipt_online'
}

function buildState(scenario: ScenarioConfig): OrderStore {
  const store: OrderStore = {
    orders: new Map(),
    history: new Map(),
    idempotency: new Map(),
    readsForbidden: false,
    writesRateLimited: false,
    nextNewSequence: 1,
  }

  const foreign = scenario === 'orders-forbidden'
  const idsToSeed = SCENARIO_IDS_TO_SEED[scenario] ?? []

  if (scenario === 'default') {
    store.readsForbidden = false
    store.writesRateLimited = false
  } else if (scenario === 'orders-forbidden') {
    store.readsForbidden = true
  } else if (scenario === 'orders-rate-limited') {
    store.writesRateLimited = true
  }

  for (const id of idsToSeed) {
    const fixture = FIXTURE_BY_ID.get(id)
    if (!fixture) continue
    const owner = foreign ? FOREIGN_BUYER_ID : fixture.order.buyer_id
    store.orders.set(id, { ...fixture.order, buyer_id: owner })
    store.history.set(id, [...fixture.history])
  }

  return store
}

/** Returns the (cached) store for the current scenario, rebuilding on switch. */
export function getOrderStore(): OrderStore {
  const scenario = getScenario()
  if (cachedScenario !== scenario || !cachedStore) {
    // A scenario is a deterministic baseline. Runtime-generated history ids
    // restart whenever the baseline changes so switching away and back does not
    // leak sequence state from the previous scenario.
    eventSeq = 0
    cachedStore = buildState(scenario)
    cachedScenario = scenario
  }
  return cachedStore
}

let cachedScenario: ScenarioConfig | null = null
let cachedStore: OrderStore | undefined

/** Deterministic in-session ids for runtime-generated history events. */
let eventSeq = 0
function nextEventId(): string {
  eventSeq += 1
  return `e-${eventSeq}`
}

export function resetOrderMockState(): void {
  cachedScenario = null
  cachedStore = undefined
  eventSeq = 0
}

// ---------------------------------------------------------------------------
// Validation / transitions
// ---------------------------------------------------------------------------

function requireOrder(store: OrderStore, id: string): OrderDto {
  const order = store.orders.get(id)
  if (!order) throw new OrderMockError(404, 'ORDER_NOT_FOUND', 'Order not found.')
  return order
}

function requireReadable(store: OrderStore): void {
  if (store.readsForbidden) {
    throw new OrderMockError(
      403,
      'ORDER_FORBIDDEN',
      'You do not have permission to access these orders.',
    )
  }
}

function requireWritable(store: OrderStore): void {
  if (store.writesRateLimited) {
    throw new OrderMockError(
      429,
      'ORDER_RATE_LIMITED',
      'Too many requests. Please retry after the rate-limit window.',
    )
  }
}

function appendHistory(
  store: OrderStore,
  orderId: string,
  entry: OrderHistoryEntryDto,
): void {
  const list = store.history.get(orderId) ?? []
  store.history.set(orderId, [...list, entry])
}

function bumpAndSet(
  store: OrderStore,
  order: OrderDto,
  patch: Partial<Pick<OrderDto, 'status' | 'payment_status'>>,
): OrderDto {
  const updated: OrderDto = {
    ...order,
    ...patch,
    version: order.version + 1,
    updated_at: nowIso(),
  }
  store.orders.set(order.id, updated)
  return updated
}

function historyEntry(
  operation: string,
  before: Pick<OrderDto, 'status' | 'payment_status'>,
  after: Pick<OrderDto, 'status' | 'payment_status'>,
  actor: string,
): OrderHistoryEntryDto {
  return {
    id: nextEventId(),
    occurred_at: nowIso(),
    operation,
    order_status_before: before.status,
    order_status_after: after.status,
    payment_status_before: before.payment_status,
    payment_status_after: after.payment_status,
    actor,
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function validateCreate(body: CreateOrderRequestDto): void {
  if (!body.buyer_id) throw new OrderMockError(400, 'ORDER_VALIDATION', 'buyer_id is required.')
  if (!isPayableMethod(body.payment_method)) {
    throw new OrderMockError(400, 'ORDER_VALIDATION', 'Unsupported payment method.')
  }
  if (!body.items || body.items.length === 0) {
    throw new OrderMockError(400, 'ORDER_VALIDATION', 'An order must contain at least one item.')
  }
  for (const item of body.items) {
    if (!item.product_id || !item.name) {
      throw new OrderMockError(400, 'ORDER_VALIDATION', 'Each item needs a product_id and name.')
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new OrderMockError(400, 'ORDER_VALIDATION', 'Item quantity must be a positive integer.')
    }
    if (!Number.isInteger(item.unit_price) || item.unit_price <= 0) {
      throw new OrderMockError(
        400,
        'ORDER_VALIDATION',
        'Item unit_price must be a positive integer in minor currency units.',
      )
    }
    const currency = item.currency.trim().toUpperCase()
    if (currency !== 'RUB') {
      throw new OrderMockError(
        400,
        'ORDER_VALIDATION',
        'MVP supports RUB only; item currency must be RUB.',
      )
    }
  }
  if (!body.delivery_address) {
    throw new OrderMockError(400, 'ORDER_VALIDATION', 'delivery_address is required.')
  }
}

export interface OrderStoreAPI {
  list(cursor?: string, limit?: number): { items: OrderDto[]; has_more: boolean; next_cursor: string | null }
  get(id: string): OrderDto
  getHistory(id: string): OrderHistoryEntryDto[]
  create(body: CreateOrderRequestDto, idempotencyKey?: string): OrderDto
  pay(id: string, idempotencyKey?: string): OrderDto
  confirm(id: string): OrderDto
  complete(id: string): OrderDto
  cancel(id: string, idempotencyKey?: string): OrderDto
  requestCancellation(id: string): OrderDto
}

function runIdempotent<T>(
  store: OrderStore,
  operation: string,
  key: string | undefined,
  hash: string,
  handler: () => { status: number; body: T },
): { status: number; body: unknown } {
  if (!key) {
    throw new OrderMockError(
      400,
      'ORDER_IDEMPOTENCY_REQUIRED',
      'Idempotency-Key is required for this command.',
    )
  }
  const existing = store.idempotency.get(key)
  if (existing) {
    if (existing.operation !== operation || existing.requestHash !== hash) {
      throw new OrderMockError(
        409,
        'ORDER_IDEMPOTENCY_CONFLICT',
        'The same Idempotency-Key was used with a different request.',
      )
    }
    return { status: existing.status, body: existing.body }
  }
  const result = handler()
  store.idempotency.set(key, { operation, requestHash: hash, status: result.status, body: result.body })
  return result
}

function primeIdempotencyConflictScenario(
  store: OrderStore,
  operation: string,
  key: string | undefined,
): void {
  if (getScenario() !== 'orders-idempotency-conflict' || !key || store.idempotency.has(key)) {
    return
  }

  // Make any UI-generated key deterministic for this demo scenario: pretend
  // the same key was already used for the same operation with a different
  // request payload. The next runIdempotent() call therefore returns the
  // source-backed 409 conflict without requiring a magic hard-coded key in UI.
  store.idempotency.set(key, {
    operation,
    requestHash: requestHash({ _sentinel: 'different-payload' }),
    status: 200,
    body: { replay: 'sentinel' },
  })
}

export function createOrderRouter(): OrderStoreAPI {
  return {
    list(cursor?: string, limit = 20) {
      const store = getOrderStore()
      requireReadable(store)
      let rows = [...store.orders.values()].sort((a, b) => {
        const byTime = b.created_at.localeCompare(a.created_at)
        return byTime !== 0 ? byTime : b.id.localeCompare(a.id)
      })
      if (cursor) {
        const { createdAt, id } = decodeOrderCursor(cursor)
        rows = rows.filter((order) => {
          const cmp = order.created_at.localeCompare(createdAt)
          return cmp < 0 || (cmp === 0 && order.id.localeCompare(id) < 0)
        })
      }
      const page = rows.slice(0, limit)
      const hasMore = rows.length > limit
      const nextCursor =
        hasMore && page.length > 0 ? encodeOrderCursor(page[page.length - 1].created_at, page[page.length - 1].id) : null
      return { items: page, has_more: hasMore, next_cursor: nextCursor }
    },

    get(id) {
      const store = getOrderStore()
      requireReadable(store)
      return requireOrder(store, id)
    },

    getHistory(id) {
      const store = getOrderStore()
      requireReadable(store)
      requireOrder(store, id)
      return store.history.get(id) ?? []
    },

    create(body, idempotencyKey) {
      const store = getOrderStore()
      requireWritable(store)
      validateCreate(body)
      primeIdempotencyConflictScenario(store, 'orders:create', idempotencyKey)
      const result = runIdempotent(store, 'orders:create', idempotencyKey, requestHash(body ?? {}), () => {
        const id = `90000000-0000-4000-8000-${String(store.nextNewSequence).padStart(12, '0')}`
        store.nextNewSequence += 1
        const totalAmount = body.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
        const order: OrderDto = {
          id,
          buyer_id: body.buyer_id,
          status: 'created',
          payment_status: 'awaiting',
          payment_method: body.payment_method,
          delivery_address: body.delivery_address,
          buyer_comment: body.buyer_comment ?? null,
          total: { amount: totalAmount, currency: 'RUB' },
          version: 1,
          created_at: nowIso(),
          updated_at: nowIso(),
          items: body.items.map((item, i) => ({
            id: `item-${id}-${i + 1}`,
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity,
            currency: item.currency,
          })),
        }
        store.orders.set(id, order)
        appendHistory(store, id, {
          id: nextEventId(),
          occurred_at: order.created_at,
          operation: 'order.created',
          order_status_before: null,
          order_status_after: 'created',
          payment_status_before: null,
          payment_status_after: null,
          actor: 'buyer',
        })
        return { status: 201, body: order }
      })
      return result.body as OrderDto
    },

    pay(id, idempotencyKey) {
      const store = getOrderStore()
      requireWritable(store)
      const order = requireOrder(store, id)
      primeIdempotencyConflictScenario(store, `orders:pay:${id}`, idempotencyKey)
      const result = runIdempotent(store, `orders:pay:${id}`, idempotencyKey, requestHash({}), () => {
        if (order.status === 'cancelled' || order.status === 'completed') {
          throw new OrderMockError(400, 'ORDER_INVALID_STATE', 'Cannot pay an order in its current state.')
        }
        if (order.payment_status === 'paid') {
          throw new OrderMockError(409, 'ORDER_ALREADY_PAID', 'Order is already paid.')
        }
        if (order.payment_status === 'processing') {
          throw new OrderMockError(409, 'PAYMENT_ALREADY_PROCESSING', 'A payment is already in progress.')
        }
        if (order.payment_method === 'prepaid' && order.status !== 'created') {
          throw new OrderMockError(400, 'ORDER_INVALID_STATE', 'Prepaid order can only be paid before fulfillment.')
        }
        if (order.payment_method === 'pay_on_receipt_online' && order.status !== 'delivered') {
          throw new OrderMockError(
            400,
            'ORDER_INVALID_STATE',
            'Pay on receipt is only accepted once the order is delivered.',
          )
        }

        // Simulate optimistic-locking version conflict for the concurrency fixture.
        if (id === ORDER_CONFLICT && getScenario() === 'orders-version-conflict') {
          // Another actor bumped the aggregate after the client read version 5.
          const bumped: OrderDto = { ...order, version: order.version + 1, updated_at: nowIso() }
          store.orders.set(id, bumped)
          throw new OrderMockError(409, 'ORDER_VERSION_CONFLICT', 'Order changed on the server.')
        }

        const processing = bumpAndSet(store, order, { payment_status: 'processing' })
        appendHistory(store, id, historyEntry(
          'order.payment_started',
          { status: order.status, payment_status: order.payment_status },
          { status: processing.status, payment_status: processing.payment_status },
          'buyer',
        ))
        const paid = bumpAndSet(store, processing, { payment_status: 'paid' })
        appendHistory(store, id, historyEntry(
          'order.paid',
          { status: processing.status, payment_status: processing.payment_status },
          { status: paid.status, payment_status: paid.payment_status },
          'provider',
        ))
        return { status: 200, body: paid }
      })
      return result.body as OrderDto
    },

    confirm(id) {
      const store = getOrderStore()
      requireWritable(store)
      const order = requireOrder(store, id)
      if (order.status !== 'created') {
        throw new OrderMockError(400, 'ORDER_INVALID_STATE', 'Order can only be confirmed from the created state.')
      }
      if (order.payment_method === 'prepaid' && order.payment_status !== 'paid') {
        throw new OrderMockError(400, 'ORDER_INVALID_STATE', 'Prepaid order requires payment before confirmation.')
      }
      const confirmed = bumpAndSet(store, order, { status: 'confirmed' })
      appendHistory(store, id, historyEntry(
        'order.confirmed',
        { status: order.status, payment_status: order.payment_status },
        { status: confirmed.status, payment_status: confirmed.payment_status },
        'service',
      ))
      return confirmed
    },

    complete(id) {
      const store = getOrderStore()
      requireWritable(store)
      const order = requireOrder(store, id)
      if (order.status !== 'delivered') {
        throw new OrderMockError(400, 'ORDER_INVALID_STATE', 'Order must be delivered before completion.')
      }
      if (order.payment_status !== 'paid') {
        throw new OrderMockError(400, 'ORDER_INVALID_STATE', 'Order must be paid before completion.')
      }
      const completed = bumpAndSet(store, order, { status: 'completed' })
      appendHistory(store, id, historyEntry(
        'order.completed',
        { status: order.status, payment_status: order.payment_status },
        { status: completed.status, payment_status: completed.payment_status },
        'service',
      ))
      return completed
    },

    cancel(id, idempotencyKey) {
      const store = getOrderStore()
      requireWritable(store)
      const order = requireOrder(store, id)
      primeIdempotencyConflictScenario(store, `orders:cancel:${id}`, idempotencyKey)
      const result = runIdempotent(store, `orders:cancel:${id}`, idempotencyKey, requestHash({}), () => {
        if (order.status !== 'cancellation_requested') {
          throw new OrderMockError(400, 'ORDER_INVALID_STATE', 'Order is not awaiting cancellation.')
        }
        if (order.payment_status === 'paid') {
          throw new OrderMockError(
            400,
            'ORDER_INVALID_STATE',
            'Paid cancellation requires a refund workflow; not available.',
          )
        }
        const cancelled = bumpAndSet(store, order, { status: 'cancelled' })
        appendHistory(store, id, historyEntry(
          'order.cancelled',
          { status: order.status, payment_status: order.payment_status },
          { status: cancelled.status, payment_status: cancelled.payment_status },
          'service',
        ))
        return { status: 200, body: cancelled }
      })
      return result.body as OrderDto
    },

    requestCancellation(id) {
      const store = getOrderStore()
      requireWritable(store)
      const order = requireOrder(store, id)
      if (order.status !== 'created' && order.status !== 'confirmed') {
        throw new OrderMockError(400, 'ORDER_INVALID_STATE', 'Cancellation can only be requested early in the lifecycle.')
      }
      if (order.payment_status === 'paid') {
        throw new OrderMockError(400, 'ORDER_INVALID_STATE', 'Paid cancellation requires a refund workflow.')
      }
      const requested = bumpAndSet(store, order, { status: 'cancellation_requested' })
      appendHistory(store, id, historyEntry(
        'order.cancellation_requested',
        { status: order.status, payment_status: order.payment_status },
        { status: requested.status, payment_status: requested.payment_status },
        'buyer',
      ))
      return requested
    },
  }
}
