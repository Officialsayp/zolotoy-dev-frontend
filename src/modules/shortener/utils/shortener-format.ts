/**
 * URL Shortener display helpers. Kept dependency-free and locale-stable so
 * long URLs/ids and datetimes render consistently on every breakpoint.
 */

/** Short, unambiguous UTC datetime for metadata rows. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toISOString().replace('T', ' ').slice(0, 16) + 'Z'
}

/** Safe display truncation for a long target URL (full value via title/copy). */
export function truncateUrl(url: string, max = 48): string {
  if (url.length <= max) return url
  const head = url.slice(0, max - 3)
  return `${head}…`
}

/** Shorten a link id for compact rows (`…abcd`). */
export function shortenId(id: string, keep = 4): string {
  if (id.length <= keep + 1) return id
  return `…${id.slice(-keep)}`
}
