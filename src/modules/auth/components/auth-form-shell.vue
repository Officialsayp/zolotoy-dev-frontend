<script setup lang="ts">
import CardPanel from '@/shared/ui/card-panel.vue'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
  }>(),
  { subtitle: '' },
)
</script>

<template>
  <div class="auth-form-shell">
    <CardPanel class="auth-form-shell__card">
      <h2 class="auth-form-shell__title">{{ title }}</h2>
      <p v-if="subtitle" class="auth-form-shell__subtitle">{{ subtitle }}</p>
      <slot />
    </CardPanel>
    <div v-if="$slots.footer" class="auth-form-shell__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.auth-form-shell {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 440px;
}

.auth-form-shell__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-form-shell__title {
  margin: 0;
  font-size: var(--text-xl);
}

.auth-form-shell__subtitle {
  margin: 0;
  color: var(--c-text-muted);
}

.auth-form-shell__footer {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}
</style>
