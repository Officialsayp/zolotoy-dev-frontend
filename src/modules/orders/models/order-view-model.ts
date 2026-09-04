/**
 * Presentation view models + mappers for the Order module.
 *
 * Network DTOs (raw statuses, minor-unit money, RFC3339 timestamps) are
 * transformed here into what the UI renders. View models are never sent back to
 * the backend (MASTER_FRONTEND_PLAN §9, "DTO vs view model").
 */

import type { OrderDto, OrderHistoryEntryDto } from './order-dto'
import type { PaymentMethod } from './order-types'

export interface OrderRowView {
  id: string
  createdAt: string
  paymentMethod: PaymentMethod
  total: string
  orderStatus: OrderDto['status']
  paymentStatus: OrderDto['payment_status']
}

export interface OrderItemView {
  id: string
  productId: string
  name: string
  quantity: number
  unitPrice: string
  totalPrice: string
}

export interface OrderDetailView {
  id: string
  buyerId: string
  status: OrderDto['status']
  paymentStatus: OrderDto['payment_status']
  paymentMethod: OrderDto['payment_method']
  deliveryAddress: string
  buyerComment: string | null
  total: string
  currency: string
  version: number
  createdAt: string
  updatedAt: string
  items: OrderItemView[]
}

export interface HistoryEntryView {
  id: string
  occurredAt: string
  operation: string
  orderStatusBefore: string | null
  orderStatusAfter: string | null
  paymentStatusBefore: string | null
  paymentStatusAfter: string | null
  actor: string | null
}

/** Format an integer minor-unit money value, e.g. `499000, RUB` -> `4 990,00 ₽`. */
export function formatMoney(amount: number, currency: string): string {
  const normalized = Number.isFinite(amount) ? amount : 0
  const value = normalized / 100
  const symbol = currencySymbol(currency)
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return symbol ? `${formatted} ${symbol}` : `${formatted} ${currency}`
}

function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'RUB':
      return '₽'
    default:
      return ''
  }
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function toOrderRowView(dto: OrderDto): OrderRowView {
  return {
    id: dto.id,
    createdAt: formatDate(dto.created_at),
    paymentMethod: dto.payment_method,
    total: formatMoney(dto.total.amount, dto.total.currency),
    orderStatus: dto.status,
    paymentStatus: dto.payment_status,
  }
}

export function toOrderDetailView(dto: OrderDto): OrderDetailView {
  return {
    id: dto.id,
    buyerId: dto.buyer_id,
    status: dto.status,
    paymentStatus: dto.payment_status,
    paymentMethod: dto.payment_method,
    deliveryAddress: dto.delivery_address,
    buyerComment: dto.buyer_comment,
    total: formatMoney(dto.total.amount, dto.total.currency),
    currency: dto.total.currency,
    version: dto.version,
    createdAt: formatDate(dto.created_at),
    updatedAt: formatDate(dto.updated_at),
    items: dto.items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: formatMoney(item.unit_price, item.currency),
      totalPrice: formatMoney(item.total_price, item.currency),
    })),
  }
}

export function toHistoryEntryView(dto: OrderHistoryEntryDto): HistoryEntryView {
  return {
    id: dto.id,
    occurredAt: formatDate(dto.occurred_at),
    operation: dto.operation,
    orderStatusBefore: dto.order_status_before,
    orderStatusAfter: dto.order_status_after,
    paymentStatusBefore: dto.payment_status_before,
    paymentStatusAfter: dto.payment_status_after,
    actor: dto.actor,
  }
}
