/** Deterministic-ish display formatting for Notification timestamps. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

/** Short, safe mid-display form for long IDs (full value still copyable). */
export function shortenId(id?: string | null): string {
  if (!id) return '—'
  if (id.length <= 26) return id
  return `${id.slice(0, 13)}…${id.slice(-8)}`
}
