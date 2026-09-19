<script setup lang="ts">
import { computed } from 'vue'

import AppButton from '@/shared/ui/app-button.vue'
import { kindForAction, type OrderAction, type OrderActionSpec } from '../models/order-action-policy'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { labelFor } from '@/shared/i18n/label-strings'
import { tr } from '@/portfolio/i18n'

defineProps<{
  actions: OrderActionSpec[]
  pendingAction: OrderAction | null
  busy?: boolean
}>()

const emit = defineEmits<{ (e: 'run', action: OrderAction): void }>()

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

</script>

<template>
  <div class="order-action-bar">
    <div v-if="actions.length === 0" class="order-action-bar__empty">
      {{ tr({ en: 'No actions available for this state.', ru: 'Для этого состояния нет доступных действий.' }, locale) }}
    </div>
    <AppButton
      v-for="spec in actions"
      :key="spec.action"
      :variant="spec.enabled ? kindForAction(spec.action, true) : 'secondary'"
      size="md"
      :disabled="!spec.enabled || busy || pendingAction === spec.action"
      :loading="pendingAction === spec.action"
      :title="!spec.enabled && spec.disabledReason ? spec.disabledReason : undefined"
      @click="emit('run', spec.action)"
    >
      {{ labelFor(spec.label, locale) }}
    </AppButton>

    <p v-if="actions.some((a) => !a.enabled && a.disabledReason)" class="order-action-bar__reasons">
      {{ actions.filter((a) => !a.enabled && a.disabledReason).map((a) => `${labelFor(a.label, locale)}: ${labelFor(a.disabledReason ?? '', locale)}`).join(' · ') }}
    </p>
  </div>
</template>

<style scoped>
.order-action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.order-action-bar__empty {
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.order-action-bar__reasons {
  flex-basis: 100%;
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}
</style>
