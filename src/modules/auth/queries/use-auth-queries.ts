import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { authApi } from '../api/auth-api'
import { authKeys } from './auth-query-keys'
import { useSessionStore } from '../store/session-store'
import { clearAuthenticatedCache } from '../session/session-reason'

/**
 * TanStack Query composables for Auth server state (me / sessions / admin) and
 * auth mutations. The session store owns the auth lifecycle; these composables
 * own server-derived data + targeted invalidation.
 */

export function useMeQuery() {
  const session = useSessionStore()
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authApi.getMe(),
    enabled: computed(() => session.isAuthenticated),
    staleTime: 60_000,
  })
}

export function useSessionsQuery() {
  const session = useSessionStore()
  return useQuery({
    queryKey: authKeys.sessions(),
    queryFn: () => authApi.getSessions(),
    enabled: computed(() => session.isAuthenticated),
    staleTime: 30_000,
  })
}

export function useAdminExampleQuery() {
  const session = useSessionStore()
  return useQuery({
    queryKey: authKeys.admin(),
    queryFn: () => authApi.getAdminExample(),
    enabled: computed(() => session.isAuthenticated),
    retry: false,
  })
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.sessions() })
    },
  })
}

/** Logout current session: backend revoke + client teardown + cache clear. */
export function useLogoutMutation() {
  const session = useSessionStore()
  return useMutation({
    mutationFn: () => session.logout(),
  })
}

/** Logout all sessions (current browser session also ends). */
export function useLogoutAllMutation() {
  const session = useSessionStore()
  return useMutation({
    mutationFn: () => session.logoutAll(),
  })
}

/** Register a new account; successful registration routes to the login form. */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => authApi.register(body),
  })
}

/** Current-session logout as a mutation (routes to overview/login on success). */
export function useLoginMutation() {
  const session = useSessionStore()
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      session.login(body.email, body.password),
    // Only a successful principal switch needs to invalidate authenticated
    // server state. Failed credentials must not wipe unrelated/public caches.
    onSuccess: () => clearAuthenticatedCache(),
  })
}
