<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { authString } from '@/shared/i18n/auth-strings'
import { tr } from '@/portfolio/i18n'

import CardPanel from '@/shared/ui/card-panel.vue'
import StatusBadge from '@/shared/ui/status-badge.vue'
import { useSessionStore } from '../store/session-store'

const session = useSessionStore()

const head = computed(() => {
  if (session.status === 'unknown') return { label: 'Session: checking…', tone: 'neutral' as const }
  if (session.status === 'authenticated') return { label: 'Signed in', tone: 'success' as const }
  return { label: 'Signed out', tone: 'neutral' as const }
})

const statusTone = computed(() => {
  if (session.isAdmin) return 'accent' as const
  return head.value.tone
})

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const statusLabel = computed(() => {
  if (session.isAuthenticated) {
    return tr(
      session.isAdmin
        ? { en: 'Authenticated · admin', ru: 'Аутентифицирован · админ' }
        : { en: 'Authenticated · user', ru: 'Аутентифицирован · пользователь' },
      locale.value,
    )
  }
  return head.value.label
})

const labels = computed(() => ({
  title: tr({ en: 'Auth Service', ru: 'Auth-сервис' }, locale.value),
  blurb: tr(
    {
      en: 'A security/session demonstrator: registration, login, a memory-only access token, HttpOnly refresh cookie, session revocation, logout all, RBAC and replay detection.',
      ru: 'Демонстратор безопасности и сессий: регистрация, вход, access-токен только в памяти, HttpOnly refresh-cookie, отзыв сессий, выход со всех устройств, RBAC и обнаружение повторного использования токенов.',
    },
    locale.value,
  ),
  profile: authString('profileTitle', locale.value),
  sessions: tr({ en: 'Sessions & devices', ru: 'Сессии и устройства' }, locale.value),
}))
</script>

<template>
  <div class="auth-overview">
    <CardPanel class="auth-overview__hero">
      <h2 class="auth-overview__title">{{ labels.title }}</h2>
      <p class="auth-overview__blurb">{{ labels.blurb }}</p>
      <div class="auth-overview__status">
        <StatusBadge :tone="statusTone" :label="statusLabel" />
      </div>
    </CardPanel>

    <div class="auth-overview__grid">
      <template v-if="session.isAuthenticated">
        <RouterLink class="auth-overview__card" to="/auth/profile">{{ labels.profile }}</RouterLink>
        <RouterLink class="auth-overview__card" to="/auth/sessions">{{ labels.sessions }}</RouterLink>
        <RouterLink v-if="session.isAdmin" class="auth-overview__card" to="/auth/admin">{{ authString('adminDemo', locale) }}</RouterLink>
      </template>
      <template v-else>
        <RouterLink class="auth-overview__card" to="/auth/login">{{ authString('signIn', locale) }}</RouterLink>
        <RouterLink class="auth-overview__card" to="/auth/register">{{ authString('registerTitle', locale) }}</RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.auth-overview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-overview__title {
  margin: 0;
  font-size: var(--text-xl);
}

.auth-overview__blurb {
  margin: 0;
  max-width: 60ch;
  color: var(--c-text-muted);
}

.auth-overview__status {
  display: flex;
}

.auth-overview__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}

.auth-overview__card {
  padding: var(--space-4);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--surface-card);
  color: var(--c-text);
  font-weight: 600;
  text-decoration: none;
}

.auth-overview__card:hover {
  border-color: var(--c-accent);
  text-decoration: none;
}
</style>
