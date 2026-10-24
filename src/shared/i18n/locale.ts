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

/**
 * One preference for both the prerendered portfolio and the demo SPA.
 * Browser languages are ordered by preference: only the primary language
 * determines the initial locale. Country/IP never participates.
 *
 * Legacy zolotoy.locale values are retained as an explicit choice so an
 * existing visitor's earlier language selection is not silently discarded.
 */
export function browserPreferredLocale(languages?: readonly string[]): Locale {
  const preferred = languages ?? (typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : [])
  const primary = (preferred[0] ?? '').split(/[-_]/, 1)[0]?.toLowerCase()
  return primary === 'ru' || primary === 'be' ? 'ru' : 'en'
}

/** null means that the visitor has never explicitly selected a language. */
export function readPersistedLocale(): Locale | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(stored) ? stored : null
  } catch {
    return null
  }
}

export function persistLocalePreference(locale: Locale): void {
  if (!isLocale(locale)) return
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Private browsing / disabled storage should never prevent switching.
  }
}

export function resolvedPreferredLocale(): Locale {
  return readPersistedLocale() ?? browserPreferredLocale()
}
