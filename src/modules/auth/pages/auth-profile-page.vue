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
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { authString } from '@/shared/i18n/auth-strings'
import { tr } from '@/portfolio/i18n'

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  profile: authString('profileTitle', locale.value),
  principal: tr({ en: 'Principal', ru: 'Субъект' }, locale.value),
  userId: tr({ en: 'User ID', ru: 'ID пользователя' }, locale.value),
  email: tr({ en: 'Email', ru: 'Email' }, locale.value),
  status: tr({ en: 'Status', ru: 'Статус' }, locale.value),
  active: tr({ en: 'Active', ru: 'Активен' }, locale.value),
  blocked: tr({ en: 'Blocked', ru: 'Заблокирован' }, locale.value),
  roles: tr({ en: 'Roles', ru: 'Роли' }, locale.value),
  created: tr({ en: 'Created', ru: 'Создан' }, locale.value),
  updated: tr({ en: 'Updated', ru: 'Обновлён' }, locale.value),
  session: tr({ en: 'Session', ru: 'Сессия' }, locale.value),
  manageSessions: tr({ en: 'Manage sessions', ru: 'Управление сессиями' }, locale.value),
  adminDemo: authString('adminDemo', locale.value),
}))

const tokenNote = computed(() =>
  tr(
    {
      en: 'Access token: in memory. The access token is never persisted to browser storage. The refresh token is an HttpOnly cookie owned by the backend and is never exposed to the app.',
      ru: 'Access-токен: в памяти. Access-токен никогда не сохраняется в хранилище браузера. Refresh-токен — это HttpOnly cookie во владении бэкенда, приложение к нему доступа не имеет.',
    },
    locale.value,
  ),
)

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
    : tr({ en: 'Profile could not be loaded.', ru: 'Не удалось загрузить профиль.' }, locale.value),
)

async function logout(): Promise<void> {
  await mutateAsync()
  await router.push('/auth/login')
}
</script>

<template>
  <div class="auth-profile">
    <div class="auth-profile__toolbar">
      <h2 class="auth-profile__title">{{ labels.profile }}</h2>
      <AppButton variant="secondary" :loading="isPending" @click="logout">{{ authString('signOut', locale) }}</AppButton>
    </div>

    <LoadingSkeleton v-if="isLoading" :rows="6" :columns="1" />

    <ErrorState
      v-else-if="isError"
      :title="tr({ en: 'Unable to load profile', ru: 'Не удалось загрузить профиль' }, locale)"
      :message="meErrorMessage"
      :on-retry="() => refetch()"
    />

    <div v-else-if="me" class="auth-profile__grid">
      <CardPanel class="auth-profile__section">
        <h3 class="auth-profile__section-title">{{ labels.principal }}</h3>
        <dl class="auth-profile__list">
          <div class="auth-profile__row">
            <dt>{{ labels.userId }}</dt>
            <dd><CodeValue :value="me.id" /></dd>
          </div>
          <div class="auth-profile__row">
            <dt>{{ labels.email }}</dt>
            <dd>{{ me.email }}</dd>
          </div>
          <div class="auth-profile__row">
            <dt>{{ labels.status }}</dt>
            <dd>
              <StatusBadge :tone="me.status === 'active' ? 'success' : 'danger'"  :label="me.status === 'active' ? labels.active : labels.blocked" />
            </dd>
          </div>
          <div class="auth-profile__row">
            <dt>{{ labels.roles }}</dt>
            <dd class="auth-profile__roles">
              <StatusBadge v-for="role in me.roles" :key="role" :tone="roleTone(role)" :label="role" />
            </dd>
          </div>
          <div v-if="createdAt" class="auth-profile__row">
            <dt>{{ labels.created }}</dt>
            <dd>{{ createdAt }}</dd>
          </div>
          <div v-if="updatedAt" class="auth-profile__row">
            <dt>{{ labels.updated }}</dt>
            <dd>{{ updatedAt }}</dd>
          </div>
        </dl>
      </CardPanel>

      <CardPanel class="auth-profile__section">
        <h3 class="auth-profile__section-title">{{ labels.session }}</h3>
        <p class="auth-profile__note">
          <strong>{{ tokenNote }}</strong>
        </p>
        <div class="auth-profile__links">
          <RouterLink class="auth-profile__link" to="/auth/sessions">{{ labels.manageSessions }}</RouterLink>
          <RouterLink v-if="session.isAdmin" class="auth-profile__link" to="/auth/admin">{{ labels.adminDemo }}</RouterLink>
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
