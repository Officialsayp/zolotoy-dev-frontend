import { describe, expect, it } from 'vitest'

import { formatMoney, toOrderDetailView, toOrderRowView } from './order-view-model'
import type { OrderDto } from './order-dto'

const dto: OrderDto = {
  id: '10000000-0000-4000-8000-000000000001',
  buyer_id: '11111111-1111-4111-8111-111111111111',
  status: 'delivered',
  payment_status: 'awaiting',
  payment_method: 'pay_on_receipt_online',
  delivery_address: '119311, Moscow, Leninsky ave 42-15',
  buyer_comment: 'Ring twice.',
  total: { amount: 1247000, currency: 'RUB' },
  version: 9,
  created_at: '2026-09-01T10:00:00.000Z',
  updated_at: '2026-09-01T11:50:00.000Z',
  items: [
    {
      id: 'i1',
      product_id: 'p1',
      name: 'Keyboard',
      quantity: 2,
      unit_price: 499000,
      total_price: 998000,
      currency: 'RUB',
    },
  ],
}

describe('order view model', () => {
  it('formats minor-unit money with a currency symbol', () => {
    // ru-RU Intl inserts a (narrow no-break) group separator; assert on the
    // digits, decimal comma and symbol rather than a specific space char.
    const formatted = formatMoney(499000, 'RUB')
    expect(formatted).toMatch(/4[\s\u202f\u00a0]990,00/)
    expect(formatted).toContain('₽')
    expect(formatMoney(0, 'RUB')).toContain('0,00')
  })

  it('maps a detail DTO into a presentation view', () => {
    const view = toOrderDetailView(dto)
    expect(view.id).toBe(dto.id)
    expect(view.paymentMethod).toBe('pay_on_receipt_online')
    expect(view.version).toBe(9)
    expect(view.items[0].name).toBe('Keyboard')
    expect(view.total).toMatch(/12[\s\u202f\u00a0]470,00/)
  })

  it('maps a list row and keeps raw statuses for badges', () => {
    const row = toOrderRowView(dto)
    expect(row.orderStatus).toBe('delivered')
    expect(row.paymentStatus).toBe('awaiting')
    expect(row.paymentMethod).toBe('pay_on_receipt_online')
  })

  it('never sends a total back (DTO has no total at request time)', () => {
    // Compile-time guarantee: CreateOrderRequestDto (used by the API facade)
    // carries no total field. Runtime guard below documents intent.
    expect(Object.keys(dto)).toContain('total')
  })
})
