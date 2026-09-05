<script setup lang="ts">
import AppButton from '@/shared/ui/app-button.vue'

defineProps<{
  lastKey: string | null
  busy?: boolean
}>()

const emit = defineEmits<{ (e: 'replay'): void }>()

function shortKey(key: string | null): string {
  if (!key) return 'none yet'
  return key.length > 12 ? `${key.slice(0, 8)}…${key.slice(-4)}` : key
}
</script>

<template>
  <div class="idem-panel">
    <div class="idem-panel__head">
      <span class="idem-panel__tag">DEMO</span>
      <span class="idem-panel__title">Idempotent command replay</span>
    </div>
    <p class="idem-panel__body">
      Last idempotency key: <code class="idem-panel__key">{{ shortKey(lastKey) }}</code>
    </p>
    <AppButton variant="secondary" size="sm" :disabled="!lastKey || busy" @click="emit('replay')">
      Replay exact request (same key)
    </AppButton>
    <p class="idem-panel__hint">
      Re-running the exact same command with the same key returns the stored result and does not
      create a second effect.
    </p>
  </div>
</template>

<style scoped>
.idem-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px dashed var(--c-border-strong);
  border-radius: var(--radius-md);
  background: var(--c-surface-muted);
}

.idem-panel__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.idem-panel__tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--c-warning);
  border: 1px solid var(--c-warning);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-1);
}

.idem-panel__title {
  font-weight: 650;
}

.idem-panel__body {
  margin: 0;
  font-size: var(--text-sm);
}

.idem-panel__key {
  font-family: var(--font-mono);
}

.idem-panel__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--c-text-muted);
}
</style>
