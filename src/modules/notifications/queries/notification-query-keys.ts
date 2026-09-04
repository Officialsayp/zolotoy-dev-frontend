/**
 * Centralized, service-prefixed TanStack Query keys for the Notification module
 * (MASTER_FRONTEND_PLAN §9, §16.2). Invalidate only affected families after a
 * retry — never the whole QueryClient without need.
 */

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: unknown) => [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  events: () => [...notificationKeys.all, 'event'] as const,
  event: (eventId: string) => [...notificationKeys.events(), eventId] as const,
} as const
