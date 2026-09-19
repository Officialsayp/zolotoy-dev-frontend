/**
 * Strict locale model for zolotoy.dev. Exactly two locales; English is the
 * default and stays canonical for public URLs (no /en/ prefix).
 */

export const LOCALES = ['en', 'ru'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** LocalStorage key for the demo locale preference (non-sensitive UI pref). */
export const LOCALE_STORAGE_KEY = 'zolotoy.locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Intl locale used for dates/numbers (public EN stays simple 'en'). */
export function intlLocale(locale: Locale): string {
  return locale === 'ru' ? 'ru-RU' : 'en'
}

/** HTML lang attribute value for a public document of this locale. */
export function htmlLang(locale: Locale): string {
  return locale
}

/**
 * Public path prefix for a locale. EN documents stay at the root; RU documents
 * live under /ru/.
 */
export function localePathPrefix(locale: Locale): string {
  return locale === 'en' ? '' : '/ru'
}

/** Localized copy record. Both locales are always required — parity is type-level. */
export interface Localized<T = string> {
  en: T
  ru: T
}
