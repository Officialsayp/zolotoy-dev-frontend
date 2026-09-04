/**
 * Temporary network-boundary DTO types for the Order module.
 *
 * These are manual types confined to the adapter boundary until the Order
 * OpenAPI stabilizes (MASTER_FRONTEND_PLAN §8, §11). Fields fixed by
 * `01_order_service.md` match the source vocabulary; anything the source leaves
 * open (list envelope, cursor names, detail/history response shapes) is a
 * `PROPOSED CONTRACT` implemented behind the module API facade so it can be
 * swapped for generated types without rewriting UI.
 *
 * Never treat these as the backend OpenAPI contract.
 */

import type { OrderStatus, PaymentMethod, PaymentStatus } from './order-types'

/** Money as integer minor units + explicit currency (source §5 Money). */
export interface OrderMoneyDto {
  amount: number
  currency: string
}

export interface OrderItemDto {
  id: string
  product_id: string
  /** ProductNameSnapshot fixed by source; JSON field name is PROPOSED. */
  name: string
  quantity: number
  unit_price: number
  total_price: number
  currency: string
}

/** Full order representation (based on aggregate fields in source §5, §18.1). */
export interface OrderDto {
  id: string
  buyer_id: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  delivery_address: string
  buyer_comment: string | null
  /** Server-computed total; client never supplies it. Shape is PROPOSED. */
  total: OrderMoneyDto
  /** Optimistic locking version (source §10). Presence/name in JSON: PROPOSED. */
  version: number
  created_at: string
  updated_at: string
  items: OrderItemDto[]
}

/**
 * Keyset paginated list response (source §12 / §18.1). Exact query parameter
 * names and envelope are PROPOSED CONTRACT, not fixed by the source.
 */
export interface OrderListDto {
  items: OrderDto[]
  has_more: boolean
  next_cursor: string | null
}

export interface OrderListQuery {
  cursor?: string
  limit?: number
}

/**
 * History entry — PROPOSED CONTRACT per MASTER_FRONTEND_PLAN §14.9. The source
 * fixes the endpoint but not the DTO.
 */
export interface OrderHistoryEntryDto {
  id: string
  occurred_at: string
  operation: string
  order_status_before: OrderStatus | null
  order_status_after: OrderStatus | null
  payment_status_before: PaymentStatus | null
  payment_status_after: PaymentStatus | null
  actor: string | null
}

/** Create-order request body — SOURCE CONTRACT fields (§8). No client `total`. */
export interface CreateOrderRequestDto {
  buyer_id: string
  payment_method: PaymentMethod
  items: CreateOrderItemDto[]
  delivery_address: string
  buyer_comment?: string
}

export interface CreateOrderItemDto {
  product_id: string
  name: string
  quantity: number
  unit_price: number
  currency: string
}

/** Empty request body for a backend command (Confirm/Complete/…). */
export type OrderCommandRequestDto = Record<string, never>
