<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/shared/ui/app-button.vue'
import FormField from '@/shared/ui/form-field.vue'
import { useToastStore } from '@/shared/ui/toast-store'
import AuthFormShell from '../components/auth-form-shell.vue'
import { isEmailExists } from '../models/auth-error'
import { useRegisterMutation } from '../queries/use-auth-queries'

const router = useRouter()
const toast = useToastStore()
const { mutateAsync, isPending } = useRegisterMutation()

const email = ref('')
const password = ref('')
const confirm = ref('')
const serverError = ref<string | null>(null)

const confirmMismatch = computed(() => confirm.value.length > 0 && confirm.value !== password.value)
const formReady = computed(
  () =>
    /^\S+@\S+\.\S+$/.test(email.value.trim()) &&
    password.value.length >= 8 &&
    confirm.value.length > 0 &&
    !confirmMismatch.value,
)

async function submit(): Promise<void> {
  if (!formReady.value || isPending.value) return
  serverError.value = null
  try {
    await mutateAsync({ email: email.value.trim(), password: password.value })
    toast.push({ tone: 'success', message: 'Account created. Sign in to continue.' })
    await router.push('/auth/login')
  } catch (error) {
    if (isEmailExists(error)) {
      serverError.value = 'An account with this email already exists. Sign in instead.'
    } else {
      serverError.value = 'Could not create the account. Please try again.'
    }
  }
}
</script>

<template>
  <AuthFormShell
    title="Create account"
    subtitle="Registration creates a user session baseline for the Auth demo."
  >
    <form novalidate class="auth-form" @submit.prevent="submit">
      <FormField label="Email" control-for="reg-email" required>
        <input
          id="reg-email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          class="auth-input"
          data-testid="reg-email"
        />
      </FormField>

      <FormField
        label="Password"
        control-for="reg-password"
        required
        helper="At least 8 characters."
      >
        <input
          id="reg-password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          class="auth-input"
          data-testid="reg-password"
        />
      </FormField>

      <FormField label="Confirm password" control-for="reg-confirm" required :error="confirmMismatch ? 'Passwords do not match.' : null">
        <input
          id="reg-confirm"
          v-model="confirm"
          type="password"
          name="password-confirm"
          autocomplete="new-password"
          class="auth-input"
          data-testid="reg-confirm"
        />
      </FormField>

      <p v-if="serverError" class="auth-form__error" role="alert" data-testid="reg-error">
        {{ serverError }}
      </p>

      <AppButton type="submit" :loading="isPending" :disabled="!formReady" full-width>
        Create account
      </AppButton>
    </form>

    <template #footer>
      <span>Already registered?</span>
      <RouterLink to="/auth/login">Sign in</RouterLink>
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
</style>
