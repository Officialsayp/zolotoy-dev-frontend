import { computed, ref } from 'vue'

import { useAppStore } from '@/app/stores/app-store'
import { useSessionStore } from '@/modules/auth/store/session-store'
import type { OrderRole } from '../models/order-types'

/**
 * Resolves which Order role the current viewer acts as.
 *
 * Until the Auth stage (Prompt 02) provides an authenticated principal, a fresh
 * run is anonymous. To make the role-dependent action policy demonstrable
 * mock-first, the module exposes a clearly-labelled demo role override ONLY in
 * mock mode. In real API mode an anonymous viewer cannot impersonate a buyer or
 * service/admin principal from the UI.
 *
 * When Auth later provides a real principal with roles, the mapping follows
 * MASTER_FRONTEND_PLAN §14.4 / P0-CS-01:
 *   Auth `user`  -> buyer
 *   Auth `admin` -> service (operator/admin semantic)
 * We never invent an Auth `operator` role.
 */

interface PrincipalLike {
  roles?: unknown
}

const demoRole = ref<OrderRole>('buyer')

function roleFromPrincipal(principal: unknown): OrderRole | null {
  if (typeof principal !== 'object' || principal === null) return null
  const roles = (principal as PrincipalLike).roles
  if (Array.isArray(roles) && roles.includes('admin')) return 'service'
  return 'buyer'
}

export function useOrderRole() {
  const app = useAppStore()
  const session = useSessionStore()

  const principalRole = computed<OrderRole | null>(() => roleFromPrincipal(session.principal))

  const canSelectDemoRole = computed(
    () => app.isMock && session.status !== 'authenticated',
  )

  const role = computed<OrderRole>(() => {
    const fromPrincipal = principalRole.value
    if (fromPrincipal) return fromPrincipal

    // Mock-only role selection is a demo capability. In live mode the
    // presentation remains conservative and backend authorization is the
    // authority for every operation.
    return demoRole.value
  })

  function setDemoRole(next: OrderRole): void {
    if (!canSelectDemoRole.value) return
    demoRole.value = next
  }

  return { role, canSelectDemoRole, setDemoRole }
}
