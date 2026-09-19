/**
 * Demo module presentation strings (status labels, button copy, messages).
 * EN source of truth; RU parity enforced by unit test.
 */
import type { Localized } from './locale'

type S = Localized

export const MODULE_STRINGS = {
  // Order action policy buttons
  pay: { en: 'Pay', ru: 'Оплатить' },
  cancel: { en: 'Cancel', ru: 'Отменить' },
  confirmCancellation: { en: 'Confirm cancellation', ru: 'Подтвердить отмену' },
  requestCancellation: { en: 'Request cancellation', ru: 'Запросить отмену' },
  refund: { en: 'Refund', ru: 'Возврат' },
  retryPayment: { en: 'Retry payment', ru: 'Повторить оплату' },

  // Order create form
  buyerId: { en: 'Buyer ID', ru: 'ID покупателя' },
  createOrder: { en: 'Create order', ru: 'Создать заказ' },
  addItem: { en: 'Add item', ru: 'Добавить позицию' },
  removeItem: { en: 'Remove', ru: 'Убрать' },
  productName: { en: 'Product name', ru: 'Название товара' },
  quantity: { en: 'Quantity', ru: 'Количество' },
  unitPrice: { en: 'Unit price', ru: 'Цена за единицу' },
  paymentMethod: { en: 'Payment method', ru: 'Способ оплаты' },
  buyerComment: { en: 'Buyer comment', ru: 'Комментарий покупателя' },
  deliveryAddress: { en: 'Delivery address', ru: 'Адрес доставки' },

  // Notification retry flow
  retryDelivery: { en: 'Retry delivery?', ru: 'Повторить доставку?' },
  retryNow: { en: 'Retry now', ru: 'Повторить сейчас' },
  attempts: { en: 'Attempts', ru: 'Попытки' },
} as const satisfies Record<string, S>

export type ModuleStringKey = keyof typeof MODULE_STRINGS

export function moduleString(key: ModuleStringKey, locale: 'en' | 'ru'): string {
  const entry = MODULE_STRINGS[key] as Localized
  return entry[locale] ?? entry.en
}
