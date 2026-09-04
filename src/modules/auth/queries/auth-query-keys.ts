/** Centralized, typed Auth query keys (server data owned by TanStack Query). */
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  sessions: () => [...authKeys.all, 'sessions'] as const,
  admin: () => [...authKeys.all, 'admin'] as const,
} as const
