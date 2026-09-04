<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/shared/ui/app-button.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import ConfirmDialog from '@/shared/ui/confirm-dialog.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'
import SessionTable from '../components/session-table.vue'
import type { AuthSessionDto } from '../models/auth-dto'
import {
  useLogoutAllMutation,
  useRevokeSessionMutation,
  useSessionsQuery,
} from '../queries/use-auth-queries'

const router = useRouter()

const {
  data: sessions,
  isLoading,
  isError,
  error,
  refetch,
} = useSessionsQuery()
const revoke = useRevokeSessionMutation()
const logoutAll = useLogoutAllMutation()

const pendingRevoke = ref<AuthSessionDto | null>(null)
const confirmLogoutAll = ref(false)

const listError = computed(() =>
  typeof error.value === 'object' && error.value !== null && 'message' in error.value
    ? String((error.value as { message: unknown }).message)
    : 'Sessions could not be loaded.',
)

function requestRevoke(sessionId: string): void {
  const target = sessions.value?.find((s) => s.id === sessionId)
  if (target) pendingRevoke.value = target
}

async function doRevoke(): Promise<void> {
  const target = pendingRevoke.value
  pendingRevoke.value = null
  if (target) await revoke.mutateAsync(target.id)
}

async function doLogoutAll(): Promise<void> {
  confirmLogoutAll.value = false
  await logoutAll.mutateAsync()
  await router.push('/auth/login')
}
</script>

<template>
  <div class="auth-sessions">
    <div class="auth-sessions__toolbar">
      <div>
        <h2 class="auth-sessions__title">Active sessions</h2>
        <p class="auth-sessions__subtitle">
          Sign out of all devices. Only safe session fields are shown — no tokens.
        </p>
      </div>
      <AppButton variant="danger" @click="confirmLogoutAll = true">Sign out of all devices</AppButton>
    </div>

    <LoadingSkeleton v-if="isLoading" :rows="5" :columns="6" />

    <ErrorState
      v-else-if="isError"
      title="Unable to load sessions"
      :message="listError"
      :on-retry="() => refetch()"
    />

    <EmptyState
      v-else-if="!sessions || sessions.length === 0"
      title="No sessions"
      description="There are no active sessions for this account."
    />

    <CardPanel v-else padding="none">
      <SessionTable :sessions="sessions" @revoke="requestRevoke" />
    </CardPanel>

    <ConfirmDialog
      :open="pendingRevoke !== null"
      title="Revoke session?"
      :message="`This will sign out the device “${pendingRevoke?.device_label || 'Unknown device'}”. You can sign in again later.`"
      confirm-label="Revoke session"
      variant="danger"
      :busy="revoke.isPending.value"
      @confirm="doRevoke"
      @update:open="pendingRevoke = null"
    />

    <ConfirmDialog
      :open="confirmLogoutAll"
      title="Sign out of all devices?"
      message="This revokes every session for your account, including the browser session you are using now. You will be signed out immediately."
      confirm-label="Sign out all"
      variant="danger"
      :busy="logoutAll.isPending.value"
      @confirm="doLogoutAll"
      @update:open="confirmLogoutAll = false"
    />
  </div>
</template>

<style scoped>
.auth-sessions {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-sessions__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.auth-sessions__title {
  margin: 0;
  font-size: var(--text-xl);
}

.auth-sessions__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}
</style>
