<script setup lang="ts">
import { computed } from 'vue'

import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'
import StatusBadge from '@/shared/ui/status-badge.vue'

import { useAdminExampleQuery, useMeQuery } from '../queries/use-auth-queries'
import { useSessionStore } from '../store/session-store'

const session = useSessionStore()
const { data: admin, isLoading, isError, error, refetch } = useAdminExampleQuery()
const { data: me } = useMeQuery()

const denied = computed(
  () => !session.isAdmin || (typeof error.value === 'object' && error.value !== null && (error.value as { kind?: string }).kind === 'authorization'),
)

const deniedMessage = computed(() => {
  if (session.isAuthenticated && !session.isAdmin) {
    return 'Your account does not have the admin role. The backend rejected this request.'
  }
  return 'This endpoint requires the admin role and returned 403.'
})

const unexpectedError = computed(() =>
  isError.value && !denied.value
    ? typeof error.value === 'object' && error.value !== null && 'message' in error.value
      ? String((error.value as { message: unknown }).message)
      : 'The admin endpoint could not be reached.'
    : '',
)
</script>

<template>
  <div class="auth-admin">
    <h2 class="auth-admin__title">Admin demo</h2>
    <p class="auth-admin__intro">
      Calls <code>/api/v1/admin/example</code>. The route guard and this badge are convenience UX —
      the backend role middleware stays authoritative.
    </p>

    <div class="auth-admin__roles">
      <StatusBadge tone="neutral" :label="session.isAuthenticated ? session.isAdmin ? 'Authenticated admin' : 'Authenticated user' : 'Anonymous'" />
    </div>

    <LoadingSkeleton v-if="isLoading" :rows="4" :columns="1" />

    <ErrorState
      v-else-if="denied"
      title="Access denied"
      :message="deniedMessage"
    />

    <ErrorState
      v-else-if="isError"
      title="Admin endpoint error"
      :message="unexpectedError"
      :on-retry="() => refetch()"
    />

    <CardPanel v-else-if="admin" class="auth-admin__result" data-testid="admin-result">
      <p class="auth-admin__message">{{ admin.message }} </p>
      <ul class="auth-admin__policies">
        <li v-for="policy in admin.policies" :key="policy"><CodeValue :value="policy" /></li>
      </ul>
      <p v-if="me" class="auth-admin__principal">
        Acting principal: {{ me.email }} (roles: {{ me.roles.join(', ') }})
      </p>
    </CardPanel>

    <EmptyState v-else title="No response" description="The admin endpoint returned no content." />
  </div>
</template>

<style scoped>
.auth-admin {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-admin__title {
  margin: 0;
  font-size: var(--text-xl);
}

.auth-admin__intro {
  margin: 0;
  max-width: 60ch;
  color: var(--c-text-muted);
}

.auth-admin__roles {
  display: flex;
}

.auth-admin__result {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.auth-admin__message {
  margin: 0;
  font-weight: 600;
}

.auth-admin__policies {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.auth-admin__principal {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}
</style>
