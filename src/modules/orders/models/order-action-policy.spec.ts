import { describe, expect, it } from 'vitest'

import {
  getOrderActions,
  ORDER_ACTIONS,
  type OrderActionContext,
  type OrderActionSpec,
} from './order-action-policy'
import type { OrderRole } from './order-types'

const CONTEXT: OrderActionContext = {
  status: 'delivered',
  paymentStatus: 'awaiting',
  paymentMethod: 'pay_on_receipt_online',
  role: 'buyer',
}

function actions(overrides: Partial<OrderActionContext>): OrderActionSpec[] {
  return getOrderActions({ ...CONTEXT, ...overrides })
}

function find<T extends { action: string }>(list: T[], action: string): T | undefined {
  return list.find((a) => a.action === action)
}

describe('order action policy', () => {
  it('only ever emits source-route-backed actions (CONFIRM/PAY/COMPLETE/CANCEL)', () => {
    for (const role of ['buyer', 'service'] as OrderRole[]) {
      for (const paymentMethod of ['prepaid', 'pay_on_receipt_online'] as const) {
        // Sample many combinations and assert no TBD/proposed fulfillment action slips through.
        const combos = [
          ['created', 'awaiting'],
          ['created', 'paid'],
          ['confirmed', 'paid'],
          ['processing', 'paid'],
          ['shipped', 'paid'],
          ['in_delivery', 'paid'],
          ['delivered', 'awaiting'],
          ['delivered', 'paid'],
          ['completed', 'paid'],
        ] as const
        for (const [status, paymentStatus] of combos) {
          const result = actions({ role, paymentMethod, status, paymentStatus })
          for (const item of result) {
            expect(['PAY', 'CONFIRM', 'CANCEL', 'COMPLETE']).toContain(item.action)
          }
        }
      }
    }
  })

  it('pay on receipt at delivered+awaiting: buyer may pay, service Complete is blocked', () => {
    const buyer = actions({ role: 'buyer', status: 'delivered', paymentStatus: 'awaiting' })
    expect(find(buyer, 'PAY')?.enabled).toBe(true)

    const service = actions({ role: 'service', status: 'delivered', paymentStatus: 'awaiting' })
    const complete = find(service, 'COMPLETE')
    expect(complete?.enabled).toBe(false)
    expect(complete?.disabledReason).toContain('Payment')
  })

  it('pay on receipt at delivered+paid: service Complete becomes available', () => {
    const service = actions({ role: 'service', status: 'delivered', paymentStatus: 'paid' })
    expect(find(service, 'COMPLETE')?.enabled).toBe(true)
  })

  it('prepaid unpaid fulfillment is blocked (may not confirm before payment)', () => {
    const service = actions({
      role: 'service',
      status: 'created',
      paymentStatus: 'awaiting',
      paymentMethod: 'prepaid',
    })
    const confirm = find(service, 'CONFIRM')
    expect(confirm?.enabled).toBe(false)
    expect(confirm?.disabledReason).toContain('paid')
  })

  it('prepaid created+paid: buyer Pay disabled (already paid), service may Confirm', () => {
    const buyer = actions({
      role: 'buyer',
      status: 'created',
      paymentStatus: 'paid',
      paymentMethod: 'prepaid',
    })
    expect(find(buyer, 'PAY')?.enabled).toBe(false)

    const service = actions({
      role: 'service',
      status: 'created',
      paymentStatus: 'paid',
      paymentMethod: 'prepaid',
    })
    expect(find(service, 'CONFIRM')?.enabled).toBe(true)
  })

  it('processing payment disables new Pay', () => {
    const buyer = actions({ role: 'buyer', status: 'delivered', paymentStatus: 'processing' })
    expect(find(buyer, 'PAY')?.enabled).toBe(false)
  })

  it('failed payment on a payable order allows retry', () => {
    const buyer = actions({ role: 'buyer', status: 'delivered', paymentStatus: 'failed' })
    expect(find(buyer, 'PAY')?.enabled).toBe(true)
  })

  it('terminal orders offer no mutation actions', () => {
    expect(
      actions({ status: 'completed', paymentStatus: 'paid', role: 'service' }),
    ).toHaveLength(0)
    expect(
      actions({ status: 'cancelled', paymentStatus: 'awaiting', role: 'buyer' }),
    ).toHaveLength(0)
  })

  it('cancellation is only CANCEL of an already-requested, unpaid order (service)', () => {
    const requested = actions({
      status: 'cancellation_requested',
      paymentStatus: 'awaiting',
      role: 'service',
    })
    expect(find(requested, 'CANCEL')?.enabled).toBe(true)

    // Paid cancellation requires a refund workflow -> disabled, no fake refund.
    const paidRequested = actions({
      status: 'cancellation_requested',
      paymentStatus: 'paid',
      role: 'service',
    })
    expect(find(paidRequested, 'CANCEL')?.enabled).toBe(false)
    expect(find(paidRequested, 'CANCEL')?.disabledReason).toContain('refund')

    // Buyer does not cancel; eligibility TBD.
    const buyer = actions({
      status: 'cancellation_requested',
      paymentStatus: 'awaiting',
      role: 'buyer',
    })
    expect(buyer).toHaveLength(0)
  })

  it('does not offer TBD fulfillment transitions as enabled actions', () => {
    // pay-on-receipt at confirmed has no source-fixed fulfillment route -> none emitted.
    const service = actions({
      role: 'service',
      status: 'confirmed',
      paymentStatus: 'awaiting',
      paymentMethod: 'pay_on_receipt_online',
    })
    expect(service).toHaveLength(0)
    expect(service.find((a) => a.action === 'START_PROCESSING')).toBeUndefined()
  })

  it('cancellation/request vocabulary exists but is not accidentally enabled elsewhere', () => {
    expect(ORDER_ACTIONS).toContain('REQUEST_CANCELLATION')
    expect(ORDER_ACTIONS).toContain('START_PROCESSING')
    const service = actions({ role: 'service', status: 'created', paymentStatus: 'awaiting' })
    expect(service.find((a) => a.action === 'REQUEST_CANCELLATION')).toBeUndefined()
  })
})
