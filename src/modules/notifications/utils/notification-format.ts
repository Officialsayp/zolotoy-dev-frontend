/** Display formatting for Notification timestamps, aware of the active demo locale. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  // Read the active locale at render time; fall back to the browser default.
  let locale: string | undefined
  try {
    locale = document?.documentElement?.lang || undefined
  } catch {
    locale = undefined
  }
  return date.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** Short, safe mid-display form for long IDs (full value still copyable). */
export function shortenId(id?: string | null): string {
  if (!id) return '—'
  if (id.length <= 26) return id
  return `${id.slice(0, 13)}…${id.slice(-8)}`
}
