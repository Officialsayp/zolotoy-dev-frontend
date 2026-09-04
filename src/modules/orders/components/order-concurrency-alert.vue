<script setup lang="ts">
import AppButton from '@/shared/ui/app-button.vue'

defineProps<{
  version?: number | null
}>()

const emit = defineEmits<{ (e: 'review'): void }>()
</script>

<template>
  <div class="concurrency-alert" role="alert">
    <strong class="concurrency-alert__title">Order changed on the server.</strong>
    <p class="concurrency-alert__message">
      The latest state has been loaded{{ version ? ` (version ${version})` : '' }}. Review it before retrying.
    </p>
    <AppButton variant="secondary" size="sm" @click="emit('review')">Review latest state</AppButton>
  </div>
</template>

<style scoped>
.concurrency-alert {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  border: 1px solid color-mix(in srgb, var(--c-warning) 45%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--c-warning) 12%, transparent);
}

.concurrency-alert__title {
  color: var(--c-warning);
}

.concurrency-alert__message {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text);
}
</style>
