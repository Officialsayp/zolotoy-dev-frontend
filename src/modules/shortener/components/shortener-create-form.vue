<script setup lang="ts">
import { computed, ref } from 'vue'

import { useAppStore } from '@/app/stores/app-store'
import type { AppError } from '@/shared/api/api-error'
import AppButton from '@/shared/ui/app-button.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import FormField from '@/shared/ui/form-field.vue'

import { aliasValidationError, urlValidationError } from '../models/shortener-domain'
import type { CreateShortLinkRequest } from '../models/shortener-dto'
import { useCreateShortLinkMutation } from '../queries/use-shortener-queries'

/**
 * Create-short-link form (MASTER_FRONTEND_PLAN §17.3). Frontend validation only
 * mirrors source rules — the backend is authoritative. On a backend rejection
 * (invalid URL, alias conflict, rate limit) the entered values are PRESERVED and
 * a safe, non-revealing error is shown. After success the returned authoritative
 * `short_url` is shown with copy/open and a detail link.
 */

const emit = defineEmits<{ (e: 'created', id: string): void }>()

const app = useAppStore()
const createMutation = useCreateShortLinkMutation()

const url = ref('')
const customAlias = ref('')
const expiresAt = ref('')
const submitted = ref(false)

const urlRef = ref<HTMLInputElement | null>(null)

const urlLocalError = computed(() => (submitted.value ? urlValidationError(url.value) : null))
const aliasLocalError = computed(() =>
  submitted.value && customAlias.value ? aliasValidationError(customAlias.value) : null,
)

interface FormNotice {
  tone: 'danger' | 'warning'
  text: string
}

const mutationNotice = computed<FormNotice | null>(() => {
  const error = createMutation.error.value
  if (!error || typeof error !== 'object' || error === null) return null
  const kind = (error as unknown as AppError).kind
  const message = (error as unknown as AppError).message
  if (kind === 'rate-limit') {
    return {
      tone: 'warning' as const,
      text: message || 'Too many requests. Slow down and try again shortly.',
    }
  }
  if (kind === 'conflict') {
    return {
      tone: 'danger' as const,
      text: message || 'That alias is already taken. Choose another one.',
    }
  }
  if (kind === 'validation') {
    return {
      tone: 'danger' as const,
      text: message || 'The server rejected this URL.',
    }
  }
  return {
    tone: 'danger' as const,
    text: message || 'The link could not be created.',
  }
})

async function onSubmit(): Promise<void> {
  submitted.value = true
  // Run local mirror validation first; backend remains authoritative.
  const urlError = urlValidationError(url.value)
  const aliasError = customAlias.value ? aliasValidationError(customAlias.value) : null
  if (urlError || aliasError) return

  const request: CreateShortLinkRequest = { url: url.value.trim() }
  if (customAlias.value.trim()) request.custom_alias = customAlias.value.trim()
  if (expiresAt.value) {
    const iso = new Date(expiresAt.value).toISOString()
    if (!Number.isNaN(Date.parse(iso))) request.expires_at = iso
  }

  try {
    const created = await createMutation.mutateAsync(request)
    // Success: all create inputs reset so a later create cannot accidentally
    // reuse a custom alias. The authoritative short_url stays in mutation data.
    url.value = ''
    customAlias.value = ''
    expiresAt.value = ''
    submitted.value = false
    emit('created', created.id)
  } catch {
    // Backend rejected — values stay in the form; `mutationNotice` explains why.
  }
}

function focusUrl(): void {
  urlRef.value?.focus()
}
</script>

<template>
  <CardPanel class="shortener-create" data-testid="shortener-create-form">
    <h3 class="shortener-create__title">New short link</h3>

    <form class="shortener-create__form" novalidate @submit.prevent="onSubmit">
      <FormField
        label="URL"
        required
        control-for="shortener-url"
        :error="urlLocalError"
        helper="http:// or https:// only."
      >
        <input
          id="shortener-url"
          ref="urlRef"
          v-model="url"
          type="url"
          class="shortener-create__input"
          :aria-invalid="Boolean(urlLocalError)"
          :aria-describedby="urlLocalError ? 'shortener-url-error' : undefined"
          data-testid="create-url"
          placeholder="https://example.com/some/long/path"
        />
      </FormField>

      <FormField
        label="Custom alias (optional)"
        control-for="shortener-alias"
        :error="aliasLocalError"
        helper="4–32 chars: letters, digits, - and _."
      >
        <input
          id="shortener-alias"
          v-model="customAlias"
          class="shortener-create__input"
          :aria-invalid="Boolean(aliasLocalError)"
          data-testid="create-alias"
          placeholder="docs"
        />
      </FormField>

      <FormField
        label="Expiration (optional)"
        control-for="shortener-expires"
        helper="Leave empty for a never-expiring link."
      >
        <input
          id="shortener-expires"
          v-model="expiresAt"
          type="datetime-local"
          class="shortener-create__input"
          data-testid="create-expires"
        />
      </FormField>

      <div class="shortener-create__actions">
        <AppButton type="submit" :loading="createMutation.isPending.value" data-testid="create-submit">
          Create short link
        </AppButton>
      </div>
    </form>

    <p
      v-if="mutationNotice"
      class="shortener-create__notice"
      :class="`shortener-create__notice--${mutationNotice.tone}`"
      role="alert"
      data-testid="create-error"
    >
      {{ mutationNotice.text }}
    </p>

    <div v-if="createMutation.data.value" class="shortener-create__result" data-testid="create-result">
      <p class="shortener-create__result-label">Created short URL</p>
      <CodeValue :value="createMutation.data.value.short_url" />
      <div class="shortener-create__result-actions">
        <a
          v-if="!app.isMock"
          :href="createMutation.data.value.short_url"
          target="_blank"
          rel="noopener noreferrer"
          class="shortener-create__open"
          data-testid="open-short-url"
        >
          Open short URL
        </a>
        <a
          v-else
          :href="createMutation.data.value.url"
          target="_blank"
          rel="noopener noreferrer"
          class="shortener-create__open"
          data-testid="simulate-short-url"
        >
          Simulate redirect
        </a>
        <AppButton variant="secondary" size="sm" @click="focusUrl()">Create another</AppButton>
      </div>
      <p v-if="app.isMock" class="shortener-create__mock-note">
        Mock mode bypasses the short host and opens the original URL directly.
        Live mode opens the backend-returned short URL and exercises the real HTTP redirect.
      </p>
    </div>
  </CardPanel>
</template>

<style scoped>
.shortener-create__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-md);
}

.shortener-create__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.shortener-create__input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-card);
  color: var(--c-text);
  font-size: var(--text-sm);
}

.shortener-create__input:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: 1px;
}

.shortener-create__actions {
  display: flex;
  justify-content: flex-end;
}

.shortener-create__notice {
  margin: var(--space-3) 0 0;
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

.shortener-create__notice--danger {
  color: var(--c-danger);
}

.shortener-create__notice--warning {
  color: var(--c-warning);
}

.shortener-create__result {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.shortener-create__result-label {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
}

.shortener-create__result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.shortener-create__open {
  color: var(--c-accent);
  font-weight: 600;
  font-size: var(--text-sm);
}

.shortener-create__mock-note {
  margin: var(--space-2) 0 0;
  font-size: var(--text-xs);
  color: var(--c-text-subtle);
}
</style>
