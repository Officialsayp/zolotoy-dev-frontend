<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/shared/ui/app-button.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'
import StatusBadge from '@/shared/ui/status-badge.vue'

import { useLogoutMutation, useMeQuery } from '../queries/use-auth-queries'
import { useSessionStore } from '../store/session-store'
import { formatDate } from '../utils/auth-format'

const router = useRouter()
const session = useSessionStore()
const { data: me, isLoading, isError, error, refetch } = useMeQuery()
const { mutateAsync, isPending } = useLogoutMutation()

const roleTone = (role: string) => (role === 'admin' ? 'accent' : 'neutral')

const createdAt = computed(() => (me.value?.created_at ? formatDate(me.value.created_at) : null))
const updatedAt = computed(() => (me.value?.updated_at ? formatDate(me.value.updated_at) : null))

const meErrorMessage = computed(() =>
  typeof error.value === 'object' && error.value !== null && 'message' in error.value
    ? String((error.value as { message: unknown }).message)
    : 'Profile could not be loaded.',
)

async function logout(): Promise<void> {
  await mutateAsync()
  await router.push('/auth/login')
}
</script>

<template>
  <div class="auth-profile">
    <div class="auth-profile__toolbar">
      <h2 class="auth-profile__title">Profile</h2>
      <AppButton variant="secondary" :loading="isPending" @click="logout">Sign out</AppButton>
    </div>

    <LoadingSkeleton v-if="isLoading" :rows="6" :columns="1" />

    <ErrorState
      v-else-if="isError"
      title="Unable to load profile"
      :message="meErrorMessage"
      :on-retry="() => refetch()"
    />

    <div v-else-if="me" class="auth-profile__grid">
      <CardPanel class="auth-profile__section">
        <h3 class="auth-profile__section-title">Principal</h3>
        <dl class="auth-profile__list">
          <div class="auth-profile__row">
            <dt>User ID</dt>
            <dd><CodeValue :value="me.id" /></dd>
          </div>
          <div class="auth-profile__row">
            <dt>Email</dt>
            <dd>{{ me.email }}</dd>
          </div>
          <div class="auth-profile__row">
            <dt>Status</dt>
            <dd>
              <StatusBadge :tone="me.status === 'active' ? 'success' : 'danger'" :label="me.status === 'active' ? 'Active' : 'Blocked'" />
            </dd>
          </div>
          <div class="auth-profile__row">
            <dt>Roles</dt>
            <dd class="auth-profile__roles">
              <StatusBadge v-for="role in me.roles" :key="role" :tone="roleTone(role)" :label="role" />
            </dd>
          </div>
          <div v-if="createdAt" class="auth-profile__row">
            <dt>Created</dt>
            <dd>{{ createdAt }}</dd>
          </div>
          <div v-if="updatedAt" class="auth-profile__row">
            <dt>Updated</dt>
            <dd>{{ updatedAt }}</dd>
          </div>
        </dl>
      </CardPanel>

      <CardPanel class="auth-profile__section">
        <h3 class="auth-profile__section-title">Session</h3>
        <p class="auth-profile__note">
          <strong>Access token: in memory.</strong> The access token is never persisted to
          browser storage. The refresh token is an <code>HttpOnly</code> cookie owned by the
          backend and is never exposed to the app.
        </p>
        <div class="auth-profile__links">
          <RouterLink class="auth-profile__link" to="/auth/sessions">Manage sessions</RouterLink>
          <RouterLink v-if="session.isAdmin" class="auth-profile__link" to="/auth/admin">Admin demo</RouterLink>
        </div>
      </CardPanel>
    </div>
  </div>
</template>

<style scoped>
.auth-profile {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-profile__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.auth-profile__title {
  margin: 0;
  font-size: var(--text-xl);
}

.auth-profile__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: var(--space-4);
}

.auth-profile__section-title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-lg);
}

.auth-profile__list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.auth-profile__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.auth-profile__row dt {
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
}

.auth-profile__row dd {
  min-width: 0;
  margin: 0;
  font-size: var(--text-base);
  overflow-wrap: anywhere;
}

.auth-profile__roles {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.auth-profile__note {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  color: var(--c-text-muted);
  overflow-wrap: anywhere;
}

.auth-profile__links {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.auth-profile__link {
  font-size: var(--text-sm);
  color: var(--c-accent);
}
</style>
