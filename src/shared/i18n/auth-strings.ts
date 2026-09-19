/**
 * Auth module UI strings (EN source, RU parity-tested).
 */
import type { Localized } from './locale'

export const AUTH_STRINGS = {
  email: { en: 'Email', ru: 'Email' },
  password: { en: 'Password', ru: 'Пароль' },
  confirmPassword: { en: 'Confirm password', ru: 'Подтвердите пароль' },
  passwordMismatch: { en: 'Passwords do not match.', ru: 'Пароли не совпадают.' },
  signIn: { en: 'Sign in', ru: 'Войти' },
  signInTitle: { en: 'Sign in', ru: 'Вход' },
  signInSubtitle: { en: 'Access your zolotoy.dev account.', ru: 'Вход в аккаунт zolotoy.dev.' },
  noAccount: { en: 'No account?', ru: 'Нет аккаунта?' },
  createOne: { en: 'Create one', ru: 'Создать' },
  demoCredentials: { en: 'Demo credentials (mock)', ru: 'Демо-данные (mock)' },
  demoCookieNote: {
    en: 'Refresh session lives in an HttpOnly cookie — never in the browser’s JS storage.',
    ru: 'Refresh-сессия хранится в HttpOnly cookie — никогда в JS-хранилище браузера.',
  },
  // Safe error messages
  errInvalidCredentials: { en: 'Invalid email or password.', ru: 'Неверный email или пароль.' },
  errBlocked: {
    en: 'This account is blocked. Contact support.',
    ru: 'Аккаунт заблокирован. Обратитесь в поддержку.',
  },
  errRateLimit: {
    en: 'Too many login attempts. Please wait a moment and try again.',
    ru: 'Слишком много попыток входа. Подождите немного и попробуйте снова.',
  },
  errUnreachable: {
    en: 'Could not reach the auth service. Please try again.',
    ru: 'Не удалось связаться с сервисом аутентификации. Попробуйте снова.',
  },
  errBootstrap: {
    en: "We couldn't verify an existing session. Sign in to continue.",
    ru: 'Не удалось проверить существующую сессию. Войдите, чтобы продолжить.',
  },
  // Session reasons
  reasonExpired: { en: 'Your session expired. Sign in again.', ru: 'Срок действия сессии истёк. Войдите снова.' },
  reasonRevoked: {
    en: 'This session was revoked. Sign in again.',
    ru: 'Эта сессия была отозвана. Войдите снова.',
  },
  reasonReuse: {
    en: 'This session was revoked because a refresh token replay was detected. Sign in again.',
    ru: 'Сессия отозвана: обнаружено повторное использование refresh-токена. Войдите снова.',
  },
  // Register
  registerTitle: { en: 'Create account', ru: 'Создание аккаунта' },
  registerSubtitle: { en: 'Register a demo account.', ru: 'Регистрация демо-аккаунта.' },
  name: { en: 'Name', ru: 'Имя' },
  register: { en: 'Register', ru: 'Зарегистрироваться' },
  haveAccount: { en: 'Already have an account?', ru: 'Уже есть аккаунт?' },
  // Profile
  profileTitle: { en: 'Profile', ru: 'Профиль' },
  role: { en: 'Role', ru: 'Роль' },
  signOut: { en: 'Sign out', ru: 'Выйти' },
  // Sessions
  sessionsTitle: { en: 'Sessions', ru: 'Сессии' },
  revokeSession: { en: 'Revoke session', ru: 'Отозвать сессию' },
  revokeSessionQ: { en: 'Revoke session?', ru: 'Отозвать сессию?' },
  unknownDevice: { en: 'Unknown device', ru: 'Неизвестное устройство' },
  signOutAll: { en: 'Sign out all', ru: 'Выйти со всех' },
  signOutAllQ: { en: 'Sign out of all devices?', ru: 'Выйти со всех устройств?' },
  // Admin
  adminDemo: { en: 'Admin demo', ru: 'Админ-демо' },
  accessDenied: { en: 'Access denied', ru: 'Доступ запрещён' },
} as const satisfies Record<string, Localized>

export function authString(key: keyof typeof AUTH_STRINGS, locale: 'en' | 'ru'): string {
  return AUTH_STRINGS[key][locale]
}
