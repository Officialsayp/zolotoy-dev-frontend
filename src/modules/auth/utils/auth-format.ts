/** Light presentation formatting for the Auth module (view-only, never sent back). */

/** Locale-aware presentation formatting for Auth timestamps (view-only). */
export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const locale = document?.documentElement?.lang || undefined
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
