/**
 * Translation dictionary for demo status labels and scenario names, keyed by
 * the canonical EN label. The EN label maps in module models remain the
 * source; this dictionary covers their RU presentation only. Unknown labels
 * fall back to the EN text (and are caught by the parity unit test).
 */
import type { Localized } from './locale'

export const LABEL_STRINGS: Record<string, Localized> = {
  // Order statuses
  Created: { en: 'Created', ru: 'Создан' },
  Confirmed: { en: 'Confirmed', ru: 'Подтверждён' },
  Processing: { en: 'Processing', ru: 'В обработке' },
  Shipped: { en: 'Shipped', ru: 'Отгружен' },
  'In delivery': { en: 'In delivery', ru: 'В доставке' },
  Delivered: { en: 'Delivered', ru: 'Доставлен' },
  Completed: { en: 'Completed', ru: 'Завершён' },
  'Cancellation requested': { en: 'Cancellation requested', ru: 'Запрошена отмена' },
  Cancelled: { en: 'Cancelled', ru: 'Отменён' },
  // Payment statuses
  'Awaiting payment': { en: 'Awaiting payment', ru: 'Ожидает оплаты' },
  'Payment processing': { en: 'Payment processing', ru: 'Оплата обрабатывается' },
  Paid: { en: 'Paid', ru: 'Оплачен' },
  'Payment failed': { en: 'Payment failed', ru: 'Ошибка оплаты' },
  Refunded: { en: 'Refunded', ru: 'Возвращён' },
  // Payment methods
  Prepaid: { en: 'Prepaid', ru: 'Предоплата' },
  'Pay on receipt (online)': { en: 'Pay on receipt (online)', ru: 'Оплата при получении (онлайн)' },
  // Notification statuses
  Sent: { en: 'Sent', ru: 'Отправлено' },
  Dead: { en: 'Dead', ru: 'Безуспешно' },
  'Retry wait': { en: 'Retry wait', ru: 'Ожидание ретрая' },
  // Shared states
  Active: { en: 'Active', ru: 'Активна' },
  Disabled: { en: 'Disabled', ru: 'Отключена' },
  Deleted: { en: 'Deleted', ru: 'Удалена' },
  Expired: { en: 'Expired', ru: 'Истекла' },
  Unknown: { en: 'Unknown', ru: 'Неизвестно' },
  Pending: { en: 'Pending', ru: 'Ожидает' },
  // Scenario names
  Default: { en: 'Default', ru: 'По умолчанию' },
  Degraded: { en: 'Degraded', ru: 'Деградация' },
  'Orders · pay on receipt': { en: 'Orders · pay on receipt', ru: 'Заказы · оплата при получении' },
  'Orders · prepaid': { en: 'Orders · prepaid', ru: 'Заказы · предоплата' },
  'Orders · payment failed → retry': {
    en: 'Orders · payment failed → retry',
    ru: 'Заказы · ошибка оплаты → ретрай',
  },
  'Orders · version conflict': { en: 'Orders · version conflict', ru: 'Заказы · конфликт версий' },
  'Orders · idempotency replay': {
    en: 'Orders · idempotency replay',
    ru: 'Заказы · повтор идемпотентности',
  },
  'Orders · idempotency conflict': {
    en: 'Orders · idempotency conflict',
    ru: 'Заказы · конфликт идемпотентности',
  },
  'Orders · empty': { en: 'Orders · empty', ru: 'Заказы · пусто' },
  'Orders · forbidden': { en: 'Orders · forbidden', ru: 'Заказы · нет доступа' },
  'Orders · rate limited': { en: 'Orders · rate limited', ru: 'Заказы · rate limit' },
  'Auth · anonymous': { en: 'Auth · anonymous', ru: 'Аутентификация · гость' },
  'Auth · active user': { en: 'Auth · active user', ru: 'Аутентификация · пользователь' },
  'Auth · active admin': { en: 'Auth · active admin', ru: 'Аутентификация · админ' },
  'Auth · invalid credentials': {
    en: 'Auth · invalid credentials',
    ru: 'Аутентификация · неверные данные',
  },
  'Auth · duplicate email': { en: 'Auth · duplicate email', ru: 'Аутентификация · занятый email' },
  'Auth · blocked user': { en: 'Auth · blocked user', ru: 'Аутентификация · заблокирован' },
  'Auth · access expired → refresh': {
    en: 'Auth · access expired → refresh',
    ru: 'Аутентификация · access истёк → refresh',
  },
  'Auth · refresh expired': {
    en: 'Auth · refresh expired',
    ru: 'Аутентификация · refresh истёк',
  },
  'Auth · session revoked': { en: 'Auth · session revoked', ru: 'Аутентификация · сессия отозвана' },
  'Auth · refresh replay detected': {
    en: 'Auth · refresh replay detected',
    ru: 'Аутентификация · повтор refresh',
  },
  'Auth · login rate limited': {
    en: 'Auth · login rate limited',
    ru: 'Аутентификация · rate limit входа',
  },
  'Notifications · happy sent': {
    en: 'Notifications · happy sent',
    ru: 'Уведомления · успешная отправка',
  },
  'Notifications · duplicate event': {
    en: 'Notifications · duplicate event',
    ru: 'Уведомления · дубликат события',
  },
  'Notifications · retryable 500 → success': {
    en: 'Notifications · retryable 500 → success',
    ru: 'Уведомления · ретраибельный 500 → успех',
  },
  'Notifications · 429 → retry wait': {
    en: 'Notifications · 429 → retry wait',
    ru: 'Уведомления · 429 → ожидание ретрая',
  },
  'Notifications · timeout/retries → dead': {
    en: 'Notifications · timeout/retries → dead',
    ru: 'Уведомления · таймаут/ретраи → dead',
  },
  'Notifications · permanent error → dead': {
    en: 'Notifications · permanent error → dead',
    ru: 'Уведомления · постоянная ошибка → dead',
  },
  'Notifications · dead → manual retry → sent': {
    en: 'Notifications · dead → manual retry → sent',
    ru: 'Уведомления · dead → ручной ретрай → отправлено',
  },
  'Notifications · empty': { en: 'Notifications · empty', ru: 'Уведомления · пусто' },
  'Notifications · forbidden': {
    en: 'Notifications · forbidden',
    ru: 'Уведомления · нет доступа',
  },
  'Notifications · service unavailable': {
    en: 'Notifications · service unavailable',
    ru: 'Уведомления · сервис недоступен',
  },
  'Shortener · happy active': {
    en: 'Shortener · happy active',
    ru: 'Сокращатель · активная ссылка',
  },
  'Shortener · populated analytics': {
    en: 'Shortener · populated analytics',
    ru: 'Сокращатель · заполненная аналитика',
  },
  'Shortener · empty analytics': {
    en: 'Shortener · empty analytics',
    ru: 'Сокращатель · без аналитики',
  },
  'Shortener · disabled': { en: 'Shortener · disabled', ru: 'Сокращатель · отключена' },
  'Shortener · expired': { en: 'Shortener · expired', ru: 'Сокращатель · истекла' },
  'Shortener · logically deleted': {
    en: 'Shortener · logically deleted',
    ru: 'Сокращатель · логически удалена',
  },
  'Shortener · alias conflict': {
    en: 'Shortener · alias conflict',
    ru: 'Сокращатель · конфликт алиаса',
  },
  'Shortener · invalid URL': { en: 'Shortener · invalid URL', ru: 'Сокращатель · неверный URL' },
  'Shortener · not found': { en: 'Shortener · not found', ru: 'Сокращатель · не найдена' },
  'Shortener · rate limited': { en: 'Shortener · rate limited', ru: 'Сокращатель · rate limit' },
  'Shortener · service unavailable': {
    en: 'Shortener · service unavailable',
    ru: 'Сокращатель · сервис недоступен',
  },

  'Pay': { en: 'Pay', ru: 'Оплатить' },
  'Confirm': { en: 'Confirm', ru: 'Подтвердить' },
  'Start processing': { en: 'Start processing', ru: 'Начать обработку' },
  'Ship': { en: 'Ship', ru: 'Отгрузить' },
  'Start delivery': { en: 'Start delivery', ru: 'Начать доставку' },
  'Mark delivered': { en: 'Mark delivered', ru: 'Отметить доставленным' },
  'Request cancellation': { en: 'Request cancellation', ru: 'Запросить отмену' },
  'Cancel order': { en: 'Cancel order', ru: 'Отменить заказ' },
  'Complete': { en: 'Complete', ru: 'Завершить' },
  'Payment is already in progress.': { en: 'Payment is already in progress.', ru: 'Оплата уже выполняется.' },
  'This order is already paid.': { en: 'This order is already paid.', ru: 'Заказ уже оплачен.' },
  'Prepaid order must be paid before fulfillment.': { en: 'Prepaid order must be paid before fulfillment.', ru: 'Предоплаченный заказ должен быть оплачен до отгрузки.' },
  'Payment is required before this action.': { en: 'Payment is required before this action.', ru: 'Перед этим действием требуется оплата.' },
  'Paid cancellation requires a refund workflow — not enabled yet.': { en: 'Paid cancellation requires a refund workflow — not enabled yet.', ru: 'Отмена оплаченного заказа требует процедуры возврата — пока не включена.' },
  'Payment is no longer payable in this state.': { en: 'Payment is no longer payable in this state.', ru: 'В этом состоянии оплата больше невозможна.' },
  'Acting role': { en: 'Acting role', ru: 'Роль' },
  'Buyer (user)': { en: 'Buyer (user)', ru: 'Покупатель (user)' },
  'Service (admin)': { en: 'Service (admin)', ru: 'Сервис (admin)' },
  'Order is paid up-front before any fulfillment. Payment must be `paid` before the order may progress through the lifecycle.': { en: 'Order is paid up-front before any fulfillment. Payment must be `paid` before the order may progress through the lifecycle.', ru: 'Заказ оплачивается заранее, до выполнения. Оплата должна быть «Оплачен», прежде чем заказ продолжит жизненный цикл.' },
  'Pay when the order arrives at the buyer. Pay becomes available only after the order is `delivered` and payment is still `awaiting` or `failed`.': { en: 'Pay when the order arrives at the buyer. Pay becomes available only after the order is `delivered` and payment is still `awaiting` or `failed`.', ru: 'Оплата при получении. Оплата становится доступна только после статуса «Доставлен», если оплата ещё «Ожидает» или «Ошибка».' },
  'URL is required.': { en: 'URL is required.', ru: 'URL обязателен.' },
  'URL is too long.': { en: 'URL is too long.', ru: 'URL слишком длинный.' },
  'URL contains invalid control characters.': { en: 'URL contains invalid control characters.', ru: 'URL содержит недопустимые управляющие символы.' },
  'URL must be http:// or https://.': { en: 'URL must be http:// or https://.', ru: 'URL должен начинаться с http:// или https://.' },
  'Alias must be 4–32 characters.': { en: 'Alias must be 4–32 characters.', ru: 'Алиас должен содержать от 4 до 32 символов.' },
  'Alias may contain only letters, digits, hyphen and underscore.': { en: 'Alias may contain only letters, digits, hyphen and underscore.', ru: 'Алиас может содержать только буквы, цифры, дефис и подчёркивание.' },
  'This alias is reserved.': { en: 'This alias is reserved.', ru: 'Этот алиас зарезервирован.' },
  'Enter a valid absolute URL.': { en: 'Enter a valid absolute URL.', ru: 'Введите корректный абсолютный URL.' },
  'Only http and https URLs are allowed.': { en: 'Only http and https URLs are allowed.', ru: 'Разрешены только URL с http и https.' },
  'mobile': { en: 'mobile', ru: 'Мобильные' },
  'desktop': { en: 'desktop', ru: 'Десктоп' },
  'tablet': { en: 'tablet', ru: 'Планшеты' },
  'other': { en: 'other', ru: 'Другое' },
  'Orders': { en: 'Orders', ru: 'Заказы' },
  'Auth': { en: 'Auth', ru: 'Аутентификация' },
  'Notifications': { en: 'Notifications', ru: 'Уведомления' },
  'Shortener': { en: 'Shortener', ru: 'Сокращатель' },
}

/** Translate a canonical EN label; unknown labels fall back to EN. */
export function labelFor(enLabel: string, locale: 'en' | 'ru'): string {
  if (locale === 'en') return enLabel
  return LABEL_STRINGS[enLabel]?.ru ?? enLabel
}
