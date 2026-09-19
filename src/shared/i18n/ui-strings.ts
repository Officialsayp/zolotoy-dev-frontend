/**
 * Shared/demo UI string dictionary. EN is the source of truth; RU is checked
 * for 1:1 key parity by unit test. Components consume strings via
 * `t(locale)` helpers — never via inline locale ternaries.
 */
import type { Localized } from './locale'

type S = Localized

export const UI_STRINGS = {
  // Shell
  skipToContent: { en: 'Skip to main content', ru: 'Перейти к основному содержимому' },
  serviceNavigation: { en: 'Service navigation', ru: 'Навигация по сервисам' },
  overview: { en: 'Overview', ru: 'Обзор' },
  brandHome: { en: 'zolotoy.dev — Portfolio home', ru: 'zolotoy.dev — на главную портфолио' },
  backToOverview: { en: 'Back to overview', ru: 'К обзору' },
  demoFooter: { en: 'zolotoy.dev — technical developer/admin environment', ru: 'zolotoy.dev — техническая среда разработчика/администратора' },
  notFoundTitle: { en: 'Not found', ru: 'Не найдено' },
  notFoundMessage: { en: 'This route does not exist.', ru: 'Такой маршрут не существует.' },

  // Demo page titles (route meta)
  titleOverview: { en: 'Overview', ru: 'Обзор' },
  titleOrders: { en: 'Orders', ru: 'Заказы' },
  titleOrderNew: { en: 'Create order', ru: 'Создание заказа' },
  titleOrderDetail: { en: 'Order detail', ru: 'Детали заказа' },
  titleAuth: { en: 'Auth', ru: 'Аутентификация' },
  titleSignIn: { en: 'Sign in', ru: 'Вход' },
  titleCreateAccount: { en: 'Create account', ru: 'Создание аккаунта' },
  titleProfile: { en: 'Profile', ru: 'Профиль' },
  titleSessions: { en: 'Sessions', ru: 'Сессии' },
  titleAdminDemo: { en: 'Admin demo', ru: 'Админ-демо' },
  titleNotifications: { en: 'Notifications', ru: 'Уведомления' },
  titleNotificationEvent: { en: 'Notification event', ru: 'Событие уведомления' },
  titleNotificationDetail: { en: 'Notification detail', ru: 'Детали уведомления' },
  titleShortener: { en: 'URL Shortener', ru: 'URL-сокращатель' },
  titleLinkDetail: { en: 'Link detail', ru: 'Детали ссылки' },

  // Runtime badge
  badgeMock: { en: 'Data source: Mock', ru: 'Источник данных: Mock' },
  badgeLive: { en: 'Data source: Live API', ru: 'Источник данных: Live API' },
  badgeMockTitle: {
    en: 'Simulated data served by MSW — no backend required',
    ru: 'Симулированные данные через MSW — бэкенд не требуется',
  },
  badgeLiveTitle: {
    en: 'Connected to live backend hosts — health is shown separately',
    ru: 'Подключение к живым хостам бэкенда — состояние сети показывается отдельно',
  },

  // Scenario switcher
  scenarioLabel: { en: 'Demo scenario', ru: 'Демо-сценарий' },

  // Auth widget
  sessionStatus: { en: 'Session', ru: 'Сессия' },
  signOut: { en: 'Sign out', ru: 'Выйти' },
  signInLink: { en: 'Sign in', ru: 'Войти' },
  profileLink: { en: 'Profile', ru: 'Профиль' },
  registerLink: { en: 'Register', ru: 'Регистрация' },

  // Theme toggle
  themeAria: { en: 'Switch to light theme', ru: 'Включить светлую тему' },
  themeAriaDark: { en: 'Switch to dark theme', ru: 'Включить тёмную тему' },

  // Language switcher
  languageLabel: { en: 'Language', ru: 'Язык' },
  languageSwitchAria: { en: 'Switch language to Russian', ru: 'Переключить язык на английский' },

  // Loading / empty / error states
  loading: { en: 'Loading…', ru: 'Загрузка…' },
  empty: { en: 'Nothing here yet', ru: 'Пока ничего нет' },
  errorState: { en: 'Something went wrong', ru: 'Что-то пошло не так' },
  retry: { en: 'Retry', ru: 'Повторить' },
} as const satisfies Record<string, S>

export type UiStringKey = keyof typeof UI_STRINGS

/** Resolve a UI string for a locale. Falls back to EN when a key is somehow missing. */
export function uiString(key: UiStringKey, locale: 'en' | 'ru'): string {
  const entry = UI_STRINGS[key] as S
  return entry[locale] ?? entry.en
}
