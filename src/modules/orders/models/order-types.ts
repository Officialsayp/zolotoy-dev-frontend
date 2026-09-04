/**
 * Order domain value types (01_order_service.md §5).
 *
 * These enums are SOURCE CONTRACT: order status and payment status are two
 * independent state machines, and both payment methods are online-only.
 * Presentation label/tone maps live here so UI never hand-writes "pretty" names
 * that drift from the source vocabulary.
 */

/** Tones supported by the shared `status-badge` primitive. */
export type OrderBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

export const ORDER_STATUSES = [
  'created',
  'confirmed',
  'processing',
  'shipped',
  'in_delivery',
  'delivered',
  'completed',
  'cancellation_requested',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = [
  'awaiting',
  'processing',
  'paid',
  'failed',
  'refunded',
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_METHODS = ['prepaid', 'pay_on_receipt_online'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/**
 * Frontend role used by the presentation action policy.
 *
 * The Order MD uses semantic `buyer` / `operator` / `admin`; the Auth MD fixes
 * only `user` / `admin`. Per MASTER_FRONTEND_PLAN §14.4 / P0-CS-01 the
 * integrated demo maps Auth `user` -> buyer and Auth `admin` -> service. We do
 * NOT invent an `operator` role.
 */
export type OrderRole = 'buyer' | 'service'

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: OrderBadgeTone }> = {
  created: { label: 'Created', tone: 'neutral' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  processing: { label: 'Processing', tone: 'info' },
  shipped: { label: 'Shipped', tone: 'accent' },
  in_delivery: { label: 'In delivery', tone: 'accent' },
  delivered: { label: 'Delivered', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  cancellation_requested: { label: 'Cancellation requested', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
}

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: OrderBadgeTone }> = {
  awaiting: { label: 'Awaiting payment', tone: 'neutral' },
  processing: { label: 'Payment processing', tone: 'info' },
  paid: { label: 'Paid', tone: 'success' },
  failed: { label: 'Payment failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'warning' },
}

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; description: string }> = {
  prepaid: {
    label: 'Prepaid',
    description:
      'Order is paid up-front before any fulfillment. Payment must be `paid` before the order may progress through the lifecycle.',
  },
  pay_on_receipt_online: {
    label: 'Pay on receipt (online)',
    description:
      'Order may be fulfilled and delivered while unpaid, but can only complete after a successful online payment on receipt. Cash is never accepted.',
  },
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value)
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === 'string' && (PAYMENT_STATUSES as readonly string[]).includes(value)
}
