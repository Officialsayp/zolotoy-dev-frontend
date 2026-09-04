<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Copy } from 'lucide-vue-next'

import { copyText } from '@/shared/lib/clipboard'

const props = withDefaults(
  defineProps<{
    value: string
    /** Optional shorter display form (full value is what gets copied). */
    display?: string
  }>(),
  {
    display: '',
  },
)

const copied = ref(false)

const shown = computed(() => props.display || props.value)

async function onCopy(): Promise<void> {
  const ok = await copyText(props.value)
  if (ok) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  }
}
</script>

<template>
  <span class="code-value">
    <code class="code-value__text break-long">{{ shown }}</code>
    <button
      type="button"
      class="code-value__copy"
      :aria-label="`Copy ${value}`"
      :title="copied ? 'Copied' : 'Copy to clipboard'"
      @click="onCopy"
    >
      <Check v-if="copied" aria-hidden="true" class="code-value__icon" />
      <Copy v-else aria-hidden="true" class="code-value__icon" />
    </button>
  </span>
</template>

<style scoped>
.code-value {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
}

.code-value__text {
  padding: 2px var(--space-2);
  background: var(--c-surface-muted);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.code-value__copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text-muted);
  cursor: pointer;
}

.code-value__copy:hover {
  color: var(--c-accent);
  border-color: var(--c-accent);
}

.code-value__icon {
  width: 14px;
  height: 14px;
}
</style>
