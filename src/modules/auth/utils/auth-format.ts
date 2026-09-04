/** Light presentation formatting for the Auth module (view-only, never sent back). */

export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
