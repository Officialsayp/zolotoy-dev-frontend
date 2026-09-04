<script setup lang="ts">
withDefaults(
  defineProps<{
    padding?: 'none' | 'md'
  }>(),
  {
    padding: 'md',
  },
)
</script>

<template>
  <section :class="['card-panel', `card-panel--${padding}`]">
    <slot />
  </section>
</template>

<style scoped>
.card-panel {
  background: var(--surface-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
}

.card-panel--md {
  padding: var(--space-4);
}

.card-panel--none {
  padding: 0;
}
</style>
