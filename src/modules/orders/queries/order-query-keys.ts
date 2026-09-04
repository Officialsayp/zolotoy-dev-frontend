/**
 * Centralized, service-prefixed TanStack Query keys for the Order module
 * (MASTER_FRONTEND_PLAN §9 "Query layer"). Invalidate only affected families.
 */

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (cursor?: string, limit?: number) => [...orderKeys.lists(), cursor ?? null, limit ?? null] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  history: (id: string) => [...orderKeys.all, 'history', id] as const,
} as const
