/**
 * Public-portfolio localization helpers. The active locale arrives as a prop
 * from the app factory (URL-derived — the public URL is the source of truth);
 * components resolve localized copy explicitly.
 */
import type { Localized } from '@/shared/i18n/locale'
import type { LText } from '@/content/types'

export type PortfolioLocale = 'en' | 'ru'

/** Public-page language takes precedence over a remembered demo preference. */
export function demoHref(locale: PortfolioLocale, path = '/demo/'): string {
  return `${path}?lang=${locale}`
}

export function tr(value: LText | Localized, locale: PortfolioLocale): string {
  return value[locale]
}

export function trList(values: (LText | Localized)[], locale: PortfolioLocale): string[] {
  return values.map((v) => v[locale])
}
