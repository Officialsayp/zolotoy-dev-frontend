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
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { authString } from '@/shared/i18n/auth-strings'
import { tr } from '@/portfolio/i18n'

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())
const session = useSessionStore()
const { data: admin, isLoading, isError, error, refetch } = useAdminExampleQuery()
const { data: me } = useMeQuery()

const denied = computed(
  () => !session.isAdmin || (typeof error.value === 'object' && error.value !== null && (error.value as { kind?: string }).kind === 'authorization'),
)

const deniedMessage = computed(() => {
  if (session.isAuthenticated && !session.isAdmin) {
    return tr(
      {
        en: 'Your account does not have the admin role. The backend rejected this request.',
        ru: 'У аккаунта нет роли admin. Бэкенд отклонил запрос.',
      },
      locale.value,
    )
  }
  return tr(
    {
      en: 'This endpoint requires the admin role and returned 403.',
      ru: 'Эндпоинт требует роль admin и вернул 403.',
    },
    locale.value,
  )
})

const unexpectedError = computed(() =>
  isError.value && !denied.value
    ? typeof error.value === 'object' && error.value !== null && 'message' in error.value
      ? String((error.value as { message: unknown }).message)
      : tr({ en: 'The admin endpoint could not be reached.', ru: 'Не удалось связаться с админ-эндпоинтом.' }, locale.value)
    : '',
)
</script>

<template>
  <div class="auth-admin">
    <h2 class="auth-admin__title">{{ authString('adminDemo', locale) }}</h2>
    <p class="auth-admin__intro">
      {{ tr({ en: 'Calls', ru: 'Вызывает' }, locale) }} <code>/api/v1/admin/example</code>.
      {{ tr(
        {
          en: 'The route guard and this badge are convenience UX — the backend role middleware stays authoritative.',
          ru: 'Роут-гард и этот бейдж — вспомогательный UX; авторитетным остаётся ролевой middleware бэкенда.',
        },
        locale,
      ) }}
    </p>

    <div class="auth-admin__roles">
      <StatusBadge tone="neutral"  :label="
        session.isAuthenticated
          ? session.isAdmin
            ? tr({ en: 'Authenticated admin', ru: 'Аутентифицированный админ' }, locale)
            : tr({ en: 'Authenticated user', ru: 'Аутентифицированный пользователь' }, locale)
          : tr({ en: 'Anonymous', ru: 'Гость' }, locale)
      " />
    </div>

    <LoadingSkeleton v-if="isLoading" :rows="4" :columns="1" />

    <ErrorState
      v-else-if="denied"
      :title="authString('accessDenied', locale)"
      :message="deniedMessage"
    />

    <ErrorState
      v-else-if="isError"
      :title="tr({ en: 'Admin endpoint error', ru: 'Ошибка админ-эндпоинта' }, locale)"
      :message="unexpectedError"
      :on-retry="() => refetch()"
    />

    <CardPanel v-else-if="admin" class="auth-admin__result" data-testid="admin-result">
      <p class="auth-admin__message">{{ admin.message }} </p>
      <ul class="auth-admin__policies">
        <li v-for="policy in admin.policies" :key="policy"><CodeValue :value="policy" /></li>
      </ul>
      <p v-if="me" class="auth-admin__principal">
        {{ tr({ en: 'Acting principal', ru: 'Действующий субъект' }, locale) }}: {{ me.email }}
        ({{ tr({ en: 'roles', ru: 'роли' }, locale) }}: {{ me.roles.join(', ') }})
      </p>
    </CardPanel>

    <EmptyState
      v-else
      :title="tr({ en: 'No response', ru: 'Нет ответа' }, locale)"
      :description="tr({ en: 'The admin endpoint returned no content.', ru: 'Админ-эндпоинт вернул пустой ответ.' }, locale)"
    />
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
