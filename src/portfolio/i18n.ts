/**
 * Public-portfolio localization helpers. The active locale arrives as a prop
 * from the app factory (URL-derived — the public URL is the source of truth);
 * components resolve localized copy explicitly.
 */
import type { Localized } from '@/shared/i18n/locale'
import type { LText } from '@/content/types'

export type PortfolioLocale = 'en' | 'ru'

export function tr(value: LText | Localized, locale: PortfolioLocale): string {
  return value[locale]
}

export function trList(values: (LText | Localized)[], locale: PortfolioLocale): string[] {
  return values.map((v) => v[locale])
}
