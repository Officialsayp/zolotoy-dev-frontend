<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/shared/ui/app-button.vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'

defineProps<{
  version?: number | null
}>()

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const emit = defineEmits<{ (e: 'review'): void }>()
</script>

<template>
  <div class="concurrency-alert" role="alert">
    <strong class="concurrency-alert__title">{{ tr({ en: 'Order changed on the server.', ru: 'Заказ изменён на сервере.' }, locale) }}</strong>
    <p class="concurrency-alert__message">
      {{ tr({ en: 'The latest state has been loaded', ru: 'Актуальное состояние загружено' }, locale) }}{{ version ? ` (${tr({ en: 'version', ru: 'версия' }, locale)} ${version})` : '' }}. {{ tr({ en: 'Review it before retrying.', ru: 'Проверьте его перед повтором.' }, locale) }}
    </p>
    <AppButton variant="secondary" size="sm" @click="emit('review')">{{ tr({ en: 'Review latest state', ru: 'Показать актуальное состояние' }, locale) }}</AppButton>
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
