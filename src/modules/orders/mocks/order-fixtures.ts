/**
 * Deterministic Order mock fixtures (MASTER_FRONTEND_PLAN §19.3).
 *
 * Stable IDs and a documented scenario epoch; no randomness on refresh. The
 * in-memory store clones these immutable source objects into a mutable session
 * state so demos can progress through state transitions and still reset cleanly.
 */

import type {
  OrderDto,
  OrderHistoryEntryDto,
  OrderItemDto,
} from '../models/order-dto'
import type { OrderRole } from '../models/order-types'

export const DEMO_USER_ID = '11111111-1111-4111-8111-111111111111'
export const DEMO_ADMIN_ID = '22222222-2222-4222-8222-222222222222'
export const FOREIGN_BUYER_ID = '99999999-9999-4999-8999-999999999999'

export const ORDER_RECEIPT_UNPAID = '10000000-0000-4000-8000-000000000001'
export const ORDER_PREPAID_AWAITING = '10000000-0000-4000-8000-000000000002'
export const ORDER_PAYMENT_FAILED = '10000000-0000-4000-8000-000000000003'
export const ORDER_COMPLETED = '10000000-0000-4000-8000-000000000004'
export const ORDER_CANCEL_REQUESTED = '10000000-0000-4000-8000-000000000005'
export const ORDER_CONFLICT = '10000000-0000-4000-8000-000000000006'
export const ORDER_PREPAID_PAID = '10000000-0000-4000-8000-000000000007'

/** Scenario epoch used for all deterministic timestamps (UTC). */
export const SCENARIO_EPOCH = '2026-09-01T12:00:00Z'

const nowIso = (offsetMinutes: number): string =>
  new Date(Date.parse(SCENARIO_EPOCH) + offsetMinutes * 60_000).toISOString()

function item(
  id: string,
  productId: string,
  name: string,
  quantity: number,
  unitPrice: number,
): OrderItemDto {
  return {
    id,
    product_id: productId,
    name,
    quantity,
    unit_price: unitPrice,
    total_price: unitPrice * quantity,
    currency: 'RUB',
  }
}

interface HistoryEvent {
  offset: number
  operation: string
  order_status_before?: OrderDto['status'] | null
  order_status_after?: OrderDto['status'] | null
  payment_status_before?: OrderDto['payment_status'] | null
  payment_status_after?: OrderDto['payment_status'] | null
  actor?: string | null
}

function history(events: HistoryEvent[]): OrderHistoryEntryDto[] {
  return events.map((entry, i) => ({
    id: `h-${1000 + i}`,
    occurred_at: nowIso(entry.offset),
    operation: entry.operation,
    order_status_before: entry.order_status_before ?? null,
    order_status_after: entry.order_status_after ?? null,
    payment_status_before: entry.payment_status_before ?? null,
    payment_status_after: entry.payment_status_after ?? null,
    actor: entry.actor ?? null,
  }))
}

interface OrderSeed {
  id: string
  buyerId: string
  status: OrderDto['status']
  paymentStatus: OrderDto['payment_status']
  paymentMethod: OrderDto['payment_method']
  items: OrderItemDto[]
  deliveryAddress: string
  buyerComment: string | null
  version: number
  createdOffset: number
  updatedOffset: number
}

function buildOrder(seed: OrderSeed): OrderDto {
  const totalAmount = seed.items.reduce((sum, item) => sum + item.total_price, 0)
  return {
    id: seed.id,
    buyer_id: seed.buyerId,
    status: seed.status,
    payment_status: seed.paymentStatus,
    payment_method: seed.paymentMethod,
    delivery_address: seed.deliveryAddress,
    buyer_comment: seed.buyerComment,
    total: { amount: totalAmount, currency: 'RUB' },
    version: seed.version,
    created_at: nowIso(seed.createdOffset),
    updated_at: nowIso(seed.updatedOffset),
    items: seed.items,
  }
}

export interface OrderFixtureBundle {
  order: OrderDto
  history: OrderHistoryEntryDto[]
  owner: OrderRole
}

function mk(owner: OrderRole, seed: OrderSeed, events: HistoryEvent[]): OrderFixtureBundle {
  return { owner, order: buildOrder(seed), history: history(events) }
}

export function buildOrderFixtures(): OrderFixtureBundle[] {
  const keyboard = item('10000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-0000000000b1', 'Mechanical Keyboard', 2, 499000)
  const mouse = item('10000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-0000000000b2', 'Ergonomic Mouse', 1, 249000)
  const monitor = item('10000000-0000-4000-8000-0000000000a3', '20000000-0000-4000-8000-0000000000b3', '27" 4K Monitor', 1, 3499000)
  const hub = item('10000000-0000-4000-8000-0000000000a4', '20000000-0000-4000-8000-0000000000b4', 'USB-C Hub', 3, 159000)
  const webcam = item('10000000-0000-4000-8000-0000000000a5', '20000000-0000-4000-8000-0000000000b5', '1080p Webcam', 1, 849000)

  return [
    mk('buyer', {
      id: ORDER_RECEIPT_UNPAID,
      buyerId: DEMO_USER_ID,
      status: 'delivered',
      paymentStatus: 'awaiting',
      paymentMethod: 'pay_on_receipt_online',
      items: [keyboard, mouse],
      deliveryAddress: '119311, Moscow, Leninsky ave 42-15',
      buyerComment: 'Ring the doorbell twice.',
      version: 9,
      createdOffset: -120,
      updatedOffset: -10,
    }, [
      { offset: -120, operation: 'order.created', order_status_after: 'created', actor: 'buyer' },
      { offset: -110, operation: 'order.confirmed', order_status_before: 'created', order_status_after: 'confirmed', actor: 'service' },
      { offset: -100, operation: 'order.processing', order_status_before: 'confirmed', order_status_after: 'processing', actor: 'service' },
      { offset: -80, operation: 'order.shipped', order_status_before: 'processing', order_status_after: 'shipped', actor: 'service' },
      { offset: -40, operation: 'order.in_delivery', order_status_before: 'shipped', order_status_after: 'in_delivery', actor: 'service' },
      { offset: -10, operation: 'order.delivered', order_status_before: 'in_delivery', order_status_after: 'delivered', actor: 'service' },
    ]),

    mk('buyer', {
      id: ORDER_PREPAID_AWAITING,
      buyerId: DEMO_USER_ID,
      status: 'created',
      paymentStatus: 'awaiting',
      paymentMethod: 'prepaid',
      items: [monitor],
      deliveryAddress: '194290, Sankt-Peterburg, Kultury pr 4-12',
      buyerComment: 'Call before arrival.',
      version: 1,
      createdOffset: -60,
      updatedOffset: -60,
    }, [
      { offset: -60, operation: 'order.created', order_status_after: 'created', actor: 'buyer' },
    ]),

    mk('buyer', {
      id: ORDER_PAYMENT_FAILED,
      buyerId: DEMO_USER_ID,
      status: 'delivered',
      paymentStatus: 'failed',
      paymentMethod: 'pay_on_receipt_online',
      items: [hub],
      deliveryAddress: '410012, Saratov, Astrakhanskaya 88',
      buyerComment: 'Leave at the door.',
      version: 8,
      createdOffset: -180,
      updatedOffset: -5,
    }, [
      { offset: -180, operation: 'order.created', order_status_after: 'created', actor: 'buyer' },
      { offset: -170, operation: 'order.confirmed', order_status_before: 'created', order_status_after: 'confirmed', actor: 'service' },
      { offset: -150, operation: 'order.delivered', order_status_before: 'confirmed', order_status_after: 'delivered', actor: 'service' },
      { offset: -8, operation: 'order.payment_started', payment_status_before: 'awaiting', payment_status_after: 'processing', actor: 'buyer' },
      { offset: -5, operation: 'order.payment_failed', payment_status_before: 'processing', payment_status_after: 'failed', actor: 'provider' },
    ]),

    mk('buyer', {
      id: ORDER_COMPLETED,
      buyerId: DEMO_USER_ID,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'pay_on_receipt_online',
      items: [webcam],
      deliveryAddress: '630090, Novosibirsk, Akademika Lavrentieva 17',
      buyerComment: '',
      version: 11,
      createdOffset: -300,
      updatedOffset: -15,
    }, [
      { offset: -300, operation: 'order.created', order_status_after: 'created', actor: 'buyer' },
      { offset: -290, operation: 'order.confirmed', order_status_before: 'created', order_status_after: 'confirmed', actor: 'service' },
      { offset: -200, operation: 'order.delivered', order_status_before: 'confirmed', order_status_after: 'delivered', actor: 'service' },
      { offset: -20, operation: 'order.payment_started', payment_status_before: 'awaiting', payment_status_after: 'processing', actor: 'buyer' },
      { offset: -16, operation: 'order.paid', payment_status_before: 'processing', payment_status_after: 'paid', actor: 'provider' },
      { offset: -15, operation: 'order.completed', order_status_before: 'delivered', order_status_after: 'completed', actor: 'service' },
    ]),

    mk('buyer', {
      id: ORDER_CANCEL_REQUESTED,
      buyerId: DEMO_USER_ID,
      status: 'cancellation_requested',
      paymentStatus: 'awaiting',
      paymentMethod: 'pay_on_receipt_online',
      items: [mouse],
      deliveryAddress: '614000, Perm, Komsomolsky pr 34',
      buyerComment: 'Ordered by mistake.',
      version: 4,
      createdOffset: -90,
      updatedOffset: -8,
    }, [
      { offset: -90, operation: 'order.created', order_status_after: 'created', actor: 'buyer' },
      { offset: -8, operation: 'order.cancellation_requested', order_status_before: 'created', order_status_after: 'cancellation_requested', actor: 'buyer' },
    ]),

    mk('buyer', {
      id: ORDER_CONFLICT,
      buyerId: DEMO_USER_ID,
      status: 'delivered',
      paymentStatus: 'awaiting',
      paymentMethod: 'pay_on_receipt_online',
      items: [keyboard, hub],
      deliveryAddress: '107045, Moscow, Posledny Pereulok 12',
      buyerComment: 'Concurrency demo order.',
      version: 5,
      createdOffset: -45,
      updatedOffset: -3,
    }, [
      { offset: -45, operation: 'order.created', order_status_after: 'created', actor: 'buyer' },
      { offset: -40, operation: 'order.confirmed', order_status_before: 'created', order_status_after: 'confirmed', actor: 'service' },
      { offset: -30, operation: 'order.delivered', order_status_before: 'confirmed', order_status_after: 'delivered', actor: 'service' },
    ]),

    mk('buyer', {
      id: ORDER_PREPAID_PAID,
      buyerId: DEMO_USER_ID,
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'prepaid',
      items: [monitor, hub],
      deliveryAddress: '125047, Moscow, Tryokhprudny 9',
      buyerComment: 'Fragile — handle with care.',
      version: 4,
      createdOffset: -140,
      updatedOffset: -20,
    }, [
      { offset: -140, operation: 'order.created', order_status_after: 'created', actor: 'buyer' },
      { offset: -130, operation: 'order.payment_started', payment_status_before: 'awaiting', payment_status_after: 'processing', actor: 'buyer' },
      { offset: -128, operation: 'order.paid', payment_status_before: 'processing', payment_status_after: 'paid', actor: 'provider' },
      { offset: -120, operation: 'order.confirmed', order_status_before: 'created', order_status_after: 'confirmed', actor: 'service' },
      { offset: -20, operation: 'order.processing', order_status_before: 'confirmed', order_status_after: 'processing', actor: 'service' },
    ]),
  ]
}
