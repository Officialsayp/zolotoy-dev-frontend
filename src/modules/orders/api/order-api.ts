import { getHttpClients } from '@/app/providers/http-clients-instance'
import type { HttpClient } from '@/shared/api/http-client'

import type {
  CreateOrderRequestDto,
  OrderCommandRequestDto,
  OrderDto,
  OrderHistoryEntryDto,
  OrderListDto,
  OrderListQuery,
} from '../models/order-dto'

/**
 * Order module API facade (MASTER_FRONTEND_PLAN §9).
 *
 * The only module code that talks to the shared HTTP client for Order
 * endpoints. Components and query composables never see raw fetch/URLs; mock
 * mode intercepts the very requests produced here, so this facade is identical
 * in mock and live mode.
 *
 * Idempotent commands (create/pay/cancel — source §9) carry the
 * `Idempotency-Key` header supplied by the caller. Confirm/complete/
 * request-cancellation are not declared idempotent by the source and send no key.
 */

const IDEMPOTENCY_HEADER = 'Idempotency-Key'

export class OrderApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderApiError'
  }
}

function client(): HttpClient {
  return getHttpClients().service.order
}

export function encodeOrderId(id: string): string {
  return encodeURIComponent(id)
}

export const orderApi = {
  async listOrders(query: OrderListQuery = {}): Promise<OrderListDto> {
    return client().request<OrderListDto>({
      path: '/orders',
      query: {
        cursor: query.cursor ?? undefined,
        limit: query.limit,
      },
    })
  },

  async getOrder(orderId: string): Promise<OrderDto> {
    return client().request<OrderDto>({ path: `/orders/${encodeOrderId(orderId)}` })
  },

  async createOrder(body: CreateOrderRequestDto, idempotencyKey: string): Promise<OrderDto> {
    return client().request<OrderDto>({
      path: '/orders',
      method: 'POST',
      body,
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    })
  },

  async payOrder(orderId: string, idempotencyKey: string): Promise<OrderDto> {
    return client().request<OrderDto>({
      path: `/orders/${encodeOrderId(orderId)}/pay`,
      method: 'POST',
      body: {} as OrderCommandRequestDto,
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    })
  },

  async confirmOrder(orderId: string): Promise<OrderDto> {
    return client().request<OrderDto>({
      path: `/orders/${encodeOrderId(orderId)}/confirm`,
      method: 'POST',
      body: {} as OrderCommandRequestDto,
    })
  },

  async requestCancellation(orderId: string): Promise<OrderDto> {
    return client().request<OrderDto>({
      path: `/orders/${encodeOrderId(orderId)}/request-cancellation`,
      method: 'POST',
      body: {} as OrderCommandRequestDto,
    })
  },

  async cancelOrder(orderId: string, idempotencyKey: string): Promise<OrderDto> {
    return client().request<OrderDto>({
      path: `/orders/${encodeOrderId(orderId)}/cancel`,
      method: 'POST',
      body: {} as OrderCommandRequestDto,
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    })
  },

  async completeOrder(orderId: string): Promise<OrderDto> {
    return client().request<OrderDto>({
      path: `/orders/${encodeOrderId(orderId)}/complete`,
      method: 'POST',
      body: {} as OrderCommandRequestDto,
    })
  },

  async getOrderHistory(orderId: string): Promise<OrderHistoryEntryDto[]> {
    return client().request<OrderHistoryEntryDto[]>({
      path: `/orders/${encodeOrderId(orderId)}/history`,
    })
  },
}
