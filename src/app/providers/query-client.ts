import { QueryClient } from '@tanstack/vue-query'

import type { AppError } from '@/shared/api/api-error'

/**
 * TanStack Vue Query client shared by all modules.
 *
 * Retry policy deliberately avoids blindly retrying requests whose failure is a
 * user/domain problem: authentication, authorization, validation, not-found,
 * conflict and rate-limit errors are never auto-retried. Only transient
 * network/server errors are retried a small number of times (MASTER_FRONTEND_PLAN §4/§13).
 */
function isNonRetryable(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const kind = (error as AppError).kind
    switch (kind) {
      case 'authentication':
      case 'authorization':
      case 'validation':
      case 'not-found':
      case 'conflict':
      case 'rate-limit':
      case 'business':
        return true
      default:
        return false
    }
  }
  return false
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (isNonRetryable(error)) return false
          return failureCount < 2
        },
        staleTime: 5_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * The app-wide QueryClient instance, captured at bootstrap so non-component
 * code (auth refresh/logout teardown) can clear authenticated server-state
 * caches without a component context.
 */
let appQueryClient: QueryClient | undefined

export function setAppQueryClient(client: QueryClient): void {
  appQueryClient = client
}

export function getAppQueryClient(): QueryClient | undefined {
  return appQueryClient
}
