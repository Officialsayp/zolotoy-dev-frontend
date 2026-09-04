<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: 'Nothing here yet',
    description: '',
  },
)
</script>

<template>
  <div class="empty-state" role="status">
    <Inbox class="empty-state__icon" aria-hidden="true" />
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="description" class="empty-state__desc">{{ description }}</p>
    <div v-if="$slots.default" class="empty-state__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-7) var(--space-4);
  text-align: center;
  color: var(--c-text-muted);
}

.empty-state__icon {
  width: 40px;
  height: 40px;
  color: var(--c-text-subtle);
  margin-bottom: var(--space-2);
}

.empty-state__title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--c-text);
}

.empty-state__desc {
  margin: 0;
  max-width: 42ch;
}

.empty-state__actions {
  margin-top: var(--space-2);
}
</style>
