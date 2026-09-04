import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Narrow auth/session capability boundary (MASTER_FRONTEND_PLAN §13, §15.6).
 *
 * Foundation deliberately keeps this minimal — it establishes the shared
 * bootstrap status and the memory-only access-token boundary that Auth (Prompt
 * 02) fills with the real refresh/login/logout flows. No Auth business logic
 * lives here yet.
 *
 * Security invariants already fixed:
 *  - access token is memory-only, never persisted;
 *  - refresh credential is browser-cookie compatible and is never touched here.
 */

export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated'

export const useSessionStore = defineStore('session', () => {
  const status = ref<SessionStatus>('unknown')
  const accessToken = ref<string | null>(null)
  const principal = ref<unknown>(null)

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isUnknown = computed(() => status.value === 'unknown')

  /**
   * Bootstrap placeholder. Until Auth stage provides the real refresh/me flow,
   * a fresh Foundation run is simply anonymous (no crash, no protected flash).
   * Auth (Prompt 02) replaces this body with the credentialed bootstrap.
   */
  async function bootstrap(): Promise<SessionStatus> {
    status.value = 'anonymous'
    return status.value
  }

  /** Memory-only access-token setter (called by Auth after login/refresh). */
  function setAccessToken(token: string | null): void {
    accessToken.value = token
  }

  /** Clear all client session state. */
  function clear(): void {
    accessToken.value = null
    principal.value = null
    status.value = 'anonymous'
  }

  return {
    status,
    accessToken,
    principal,
    isAuthenticated,
    isUnknown,
    bootstrap,
    setAccessToken,
    clear,
  }
})
