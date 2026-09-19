<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { UserRound } from 'lucide-vue-next'

import AppButton from '@/shared/ui/app-button.vue'
import { useSessionStore } from '@/modules/auth/store/session-store'
import { useLogoutMutation } from '@/modules/auth/queries/use-auth-queries'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { uiString } from '@/shared/i18n/ui-strings'

const props = defineProps<{ locale?: 'en' | 'ru' }>()

const session = useSessionStore()
const router = useRouter()
const localeStore = useLocaleStore()
const { mutateAsync, isPending } = useLogoutMutation()

const locale = computed(() => props.locale ?? localeStore.get())

const label = computed(() => {
  if (session.status === 'authenticated')
    return uiString('signInLink', locale.value) === 'Войти' ? 'Вы вошли' : 'Signed in'
  if (session.status === 'anonymous')
    return locale.value === 'ru' ? 'Гость' : 'Guest'
  return locale.value === 'ru' ? 'Проверка сессии…' : 'Checking session…'
})

const tone = computed(() => {
  if (session.status === 'authenticated') return 'status--ok'
  if (session.status === 'anonymous') return 'status--idle'
  return 'status--pending'
})

async function logout(): Promise<void> {
  await mutateAsync()
  await router.push('/auth/login')
}
</script>

<template>
  <div class="auth-widget" :class="tone">
    <span class="auth-widget__status" :title="`${uiString('sessionStatus', locale)}: ${session.status}`">
      <UserRound aria-hidden="true" />
      <span>{{ session.isAuthenticated ? session.email || label : label }}</span>
      <span v-if="session.isAdmin" class="auth-widget__role">admin</span>
    </span>

    <template v-if="session.isAuthenticated">
      <RouterLink class="auth-widget__link" to="/auth/profile">{{ uiString('profileLink', locale) }}</RouterLink>
      <AppButton variant="ghost" size="sm" :loading="isPending" @click="logout">{{ uiString('signOut', locale) }}</AppButton>
    </template>
    <RouterLink v-else-if="session.status === 'anonymous'" class="auth-widget__link" to="/auth/login">
      {{ uiString('signInLink', locale) }}
    </RouterLink>
  </div>
</template>

<style scoped>
.auth-widget {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.auth-widget__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.auth-widget :deep(svg) {
  width: 16px;
  height: 16px;
}

.auth-widget__role {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--c-accent);
}

.auth-widget.status--ok .auth-widget__status {
  color: var(--c-success);
}

.auth-widget.status--pending .auth-widget__status {
  color: var(--c-text-subtle);
}

.auth-widget__link {
  color: var(--c-accent);
}
</style>
