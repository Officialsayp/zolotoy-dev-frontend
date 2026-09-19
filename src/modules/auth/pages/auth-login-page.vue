<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/app/stores/app-store'
import { normalizeDemoRedirectTarget } from '@/app/router/guards'
import AppButton from '@/shared/ui/app-button.vue'
import FormField from '@/shared/ui/form-field.vue'
import AuthFormShell from '../components/auth-form-shell.vue'
import { isUserBlocked } from '../models/auth-error'
import { authString } from '@/shared/i18n/auth-strings'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { reasonMessage, type AuthFailureReason } from '../session/session-reason'
import { useLoginMutation } from '../queries/use-auth-queries'
import { useSessionStore } from '../store/session-store'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const app = useAppStore()
const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())
const { isMock } = storeToRefs(app)

const { mutateAsync, isPending } = useLoginMutation()

const email = ref('')
const password = ref('')
const serverError = ref<string | null>(null)

const reason = computed<AuthFailureReason>(() => {
  const q = route.query.reason
  if (q === 'reuse-detected' || q === 'revoked' || q === 'expired') return q
  return session.lastReason
})

const reasonText = computed(() => reasonMessage(reason.value, locale.value))
const bootstrapWarning = computed(() =>
  session.bootstrapError ? authString('errBootstrap', locale.value) : '',
)

function errorMessage(error: unknown): string {
  if (isUserBlocked(error)) return authString('errBlocked', locale.value)
  const kind = typeof error === 'object' && error !== null ? (error as { kind?: string }).kind : undefined
  if (kind === 'rate-limit') return authString('errRateLimit', locale.value)
  if (kind === 'network' || kind === 'timeout' || kind === 'server') {
    return authString('errUnreachable', locale.value)
  }
  // Generic safe message — never reveals "user not found" vs "wrong password".
  return authString('errInvalidCredentials', locale.value)
}

async function fillDemo(emailValue: string): Promise<void> {
  email.value = emailValue
  password.value = 'DemoPassword!123'
}

async function submit(): Promise<void> {
  if (!email.value.trim() || !password.value || isPending.value) return
  serverError.value = null
  try {
    await mutateAsync({ email: email.value.trim(), password: password.value })
    // One normalization of a /demo/... browser target to the internal path;
    // rejects external URLs, invalid encodings, backslash tricks and loops.
    const target = normalizeDemoRedirectTarget(route.query.redirect) ?? '/auth/profile'
    await router.push(target)
  } catch (error) {
    serverError.value = errorMessage(error)
  }
}
</script>

<template>
  <AuthFormShell :title="authString('signInTitle', locale)" :subtitle="authString('signInSubtitle', locale)">
    <div v-if="reasonText" class="auth-alert auth-alert--danger" role="alert" data-testid="auth-reason">
      {{ reasonText }}
    </div>
    <div v-if="bootstrapWarning" class="auth-alert" role="status">{{ bootstrapWarning }}</div>

    <form novalidate class="auth-form" @submit.prevent="submit">
      <FormField :label="authString('email', locale)" control-for="auth-email" required>
        <input
          id="auth-email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          class="auth-input"
          data-testid="auth-email"
        />
      </FormField>

      <FormField :label="authString('password', locale)" control-for="auth-password" required>
        <input
          id="auth-password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          class="auth-input"
          data-testid="auth-password"
        />
      </FormField>

      <p
        id="auth-login-form-error"
        v-if="serverError"
        class="auth-form__error"
        role="alert"
        data-testid="auth-error"
      >
        {{ serverError }}
      </p>

      <AppButton type="submit" :loading="isPending" :disabled="!email.trim() || !password" full-width>
        {{ authString('signIn', locale) }}
      </AppButton>
    </form>

    <div v-if="isMock" class="auth-demo">
      <p class="auth-demo__label">{{ authString('demoCredentials', locale) }}</p>
      <div class="auth-demo__actions">
        <AppButton variant="secondary" size="sm" @click="fillDemo('user@zolotoy.dev')">
          user@zolotoy.dev
        </AppButton>
        <AppButton variant="secondary" size="sm" @click="fillDemo('admin@zolotoy.dev')">
          admin@zolotoy.dev
        </AppButton>
      </div>
      <p class="auth-demo__note">{{ authString('demoCookieNote', locale) }}</p>
    </div>

    <template #footer>
      <span>{{ authString('noAccount', locale) }}</span>
      <RouterLink to="/auth/register">{{ authString('createOne', locale) }}</RouterLink>
    </template>
  </AuthFormShell>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-input {
  width: 100%;
  padding: 8px var(--space-2);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-sm);
  font-family: inherit;
}

.auth-form__error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-danger);
}

.auth-alert {
  padding: var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-muted);
  color: var(--c-text-muted);
  font-size: var(--text-sm);
}

.auth-alert--danger {
  border-color: color-mix(in srgb, var(--c-danger) 45%, transparent);
  background: color-mix(in srgb, var(--c-danger) 10%, transparent);
  color: var(--c-danger);
}

.auth-demo {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px dashed var(--c-border-strong);
  border-radius: var(--radius-md);
}

.auth-demo__label {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
}

.auth-demo__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.auth-demo__note {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--c-text-subtle);
}
</style>
