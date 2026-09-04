<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

import AppButton from './app-button.vue'

withDefaults(
  defineProps<{
    title?: string
    message?: string
    onRetry?: () => void
  }>(),
  {
    title: 'Something went wrong',
    message: '',
    onRetry: undefined,
  },
)
</script>

<template>
  <div class="error-state" role="alert">
    <AlertTriangle class="error-state__icon" aria-hidden="true" />
    <p class="error-state__title">{{ title }}</p>
    <p v-if="message" class="error-state__message">{{ message }}</p>
    <div v-if="$slots.default || onRetry" class="error-state__actions">
      <slot>
        <AppButton variant="secondary" size="sm" @click="onRetry?.()">Retry</AppButton>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  text-align: center;
}

.error-state__icon {
  width: 36px;
  height: 36px;
  color: var(--c-danger);
  margin-bottom: var(--space-2);
}

.error-state__title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 650;
  color: var(--c-text);
}

.error-state__message {
  margin: 0;
  max-width: 56ch;
  color: var(--c-text-muted);
  overflow-wrap: anywhere;
}

.error-state__actions {
  margin-top: var(--space-2);
}
</style>
