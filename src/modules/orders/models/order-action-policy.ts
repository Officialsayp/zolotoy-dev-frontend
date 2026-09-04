/**
 * Centralized Order action policy (MASTER_FRONTEND_PLAN §14.4, §14.5).
 *
 * This is the SINGLE place that decides OrderStatus × PaymentStatus ×
 * PaymentMethod × role presentation actions. It never mutates state and never
 * claims disabled actions replace backend validation — backend invariants from
 * `01_order_service.md` remain authoritative.
 *
 * Route-backed conservatism:
 *  - Only commands whose routes are SOURCE CONTRACT are ever ENABLED:
 *    `pay`, `confirm`, `cancel`, `complete`. START_PROCESSING / SHIP /
 *    START_DELIVERY / MARK_DELIVERED belong to PROPOSED / TBD fulfillment routes
 *    (P0-O-01, master plan §18.1) and are therefore never emitted until backend
 *    fixes them.
 *  - `pay_on_receipt_online` earliest Pay is TBD (P0-O-02): Pay only at
 *    `delivered + awaiting/failed`.
 *  - cancellation eligibility is TBD (P0-O-03); only CANCEL of an already
 *    `cancellation_requested`, non-paid order is offered to `service`.
 *    REQUEST_CANCELLATION is TBD and never emitted.
 *  - paid cancellation/refund orchestration is TBD (P0-O-04): CANCEL of a paid
 *    order is disabled, never a fake instant refund.
 */

import type { OrderRole } from './order-types'
import type { PaymentMethod, PaymentStatus } from './order-types'
import type { OrderStatus } from './order-types'

export const ORDER_ACTIONS = [
  'PAY',
  'CONFIRM',
  'START_PROCESSING',
  'SHIP',
  'START_DELIVERY',
  'MARK_DELIVERED',
  'REQUEST_CANCELLATION',
  'CANCEL',
  'COMPLETE',
] as const

export type OrderAction = (typeof ORDER_ACTIONS)[number]

export const ORDER_ACTION_LABELS: Record<OrderAction, string> = {
  PAY: 'Pay',
  CONFIRM: 'Confirm',
  START_PROCESSING: 'Start processing',
  SHIP: 'Ship',
  START_DELIVERY: 'Start delivery',
  MARK_DELIVERED: 'Mark delivered',
  REQUEST_CANCELLATION: 'Request cancellation',
  CANCEL: 'Cancel order',
  COMPLETE: 'Complete',
}

/** Actions backed by a SOURCE CONTRACT route that we may enable. */
const ENABLEABLE_ACTIONS: ReadonlySet<OrderAction> = new Set<OrderAction>([
  'PAY',
  'CONFIRM',
  'CANCEL',
  'COMPLETE',
])

export interface OrderActionSpec {
  action: OrderAction
  label: string
  enabled: boolean
  disabledReason?: string
  /** Reversibility/financial consequences -> require explicit confirmation. */
  requiresConfirmation: boolean
}

export interface OrderActionContext {
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  role: OrderRole
}

const REASONS = {
  paymentProcessing: 'Payment is already in progress.',
  alreadyPaid: 'This order is already paid.',
  prepaidRequired: 'Prepaid order must be paid before fulfillment.',
  paymentRequired: 'Payment is required before this action.',
  refundWorkflow: 'Paid cancellation requires a refund workflow — not enabled yet.',
} as const

export function kindForAction(action: OrderAction, enabled: boolean): 'primary' | 'danger' | 'secondary' {
  if (!enabled) return 'secondary'
  if (action === 'CANCEL') return 'danger'
  if (action === 'PAY') return 'primary'
  return 'primary'
}

/** Actions requiring explicit destructive confirmation. */
export function actionRequiresConfirmation(action: OrderAction): boolean {
  return action === 'CANCEL'
}

function spec(action: OrderAction, enabled: boolean, disabledReason?: string): OrderActionSpec {
  return {
    action,
    label: ORDER_ACTION_LABELS[action],
    enabled,
    disabledReason: enabled ? undefined : disabledReason,
    requiresConfirmation: actionRequiresConfirmation(action),
  }
}

function paySpec(paymentStatus: PaymentStatus): OrderActionSpec {
  if (paymentStatus === 'processing') return spec('PAY', false, REASONS.paymentProcessing)
  if (paymentStatus === 'paid') return spec('PAY', false, REASONS.alreadyPaid)
  if (paymentStatus === 'awaiting' || paymentStatus === 'failed') {
    return spec('PAY', true)
  }
  // refunded -> no pay (refund/order relation TBD)
  return spec('PAY', false, 'Payment is no longer payable in this state.')
}

/**
 * Returns the presentation actions for the current state + role. Only
 * source-route-backed actions are emitted; everything else stays TBD and is
 * therefore not offered (it must not become an accidentally-enabled action).
 */
export function getOrderActions(context: OrderActionContext): OrderActionSpec[] {
  const { status, paymentStatus, paymentMethod, role } = context
  const result: OrderActionSpec[] = []

  // Terminal order states have no mutation actions.
  if (status === 'cancelled' || status === 'completed') {
    return result
  }

  if (status === 'cancellation_requested') {
    if (role === 'service') {
      result.push(
        paymentStatus === 'paid'
          ? spec('CANCEL', false, REASONS.refundWorkflow)
          : spec('CANCEL', true),
      )
    }
    return result
  }

  if (paymentMethod === 'prepaid') {
    // Buyer pays at created; retry after failed; disabled while processing/paid.
    if (role === 'buyer' && status === 'created') {
      result.push(paySpec(paymentStatus))
    }
    // Service: CONFIRM at created and COMPLETE at delivered both require paid.
    if (role === 'service') {
      if (status === 'created') {
        result.push(
          paymentStatus === 'paid'
            ? spec('CONFIRM', true)
            : spec('CONFIRM', false, paymentStatus === 'processing' ? REASONS.paymentProcessing : REASONS.prepaidRequired),
        )
      } else if (status === 'delivered') {
        result.push(
          paymentStatus === 'paid'
            ? spec('COMPLETE', true)
            : spec('COMPLETE', false, REASONS.paymentRequired),
        )
      }
    }
    return result
  }

  // pay_on_receipt_online: fulfillment (CONFIRM) is allowed while unpaid; only
  // COMPLETE requires paid (source invariant 12).
  if (role === 'service') {
    if (status === 'created') {
      result.push(spec('CONFIRM', true))
    } else if (status === 'delivered') {
      if (paymentStatus === 'paid') {
        result.push(spec('COMPLETE', true))
      } else if (paymentStatus === 'processing') {
        result.push(spec('COMPLETE', false, REASONS.paymentProcessing))
      } else {
        result.push(spec('COMPLETE', false, REASONS.paymentRequired))
      }
    }
  }

  if (role === 'buyer' && status === 'delivered') {
    result.push(paySpec(paymentStatus))
  }

  return result
}

/** Kept exported for callers that want to test the enableable set directly. */
export { ENABLEABLE_ACTIONS }
