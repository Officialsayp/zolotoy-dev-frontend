/**
 * Centralized, service-prefixed TanStack Query keys for the URL Shortener module
 * (MASTER_FRONTEND_PLAN §9, §17). Invalidate only affected families after a
 * mutation — never the whole QueryClient.
 */

export const shortenerKeys = {
  all: ['shortener'] as const,
  lists: () => [...shortenerKeys.all, 'list'] as const,
  list: (filters: unknown) => [...shortenerKeys.lists(), filters] as const,
  details: () => [...shortenerKeys.all, 'detail'] as const,
  detail: (id: string) => [...shortenerKeys.details(), id] as const,
  analytics: (id: string) => [...shortenerKeys.all, 'analytics', id] as const,
} as const
