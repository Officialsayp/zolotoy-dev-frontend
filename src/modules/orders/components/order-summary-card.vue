<script setup lang="ts">
import { computed } from 'vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import type { OrderDetailView } from '../models/order-view-model'

defineProps<{ order: OrderDetailView }>()

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  buyerId: tr({ en: 'Buyer ID', ru: 'ID покупателя' }, locale.value),
  total: tr({ en: 'Total', ru: 'Итого' }, locale.value),
  address: tr({ en: 'Delivery address', ru: 'Адрес доставки' }, locale.value),
  comment: tr({ en: 'Buyer comment', ru: 'Комментарий покупателя' }, locale.value),
  version: tr({ en: 'Aggregate version', ru: 'Версия агрегата' }, locale.value),
  created: tr({ en: 'Created', ru: 'Создан' }, locale.value),
  updated: tr({ en: 'Updated', ru: 'Обновлён' }, locale.value),
}))

/** Row helper renders a key/value pair. */
const ROW = { display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' } as const
</script>

<template>
  <CardPanel class="order-summary">
    <div class="order-summary__row" :style="ROW">
      <dt>{{ labels.buyerId }}</dt>
      <dd><CodeValue :value="order.buyerId" /></dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>{{ labels.total }}</dt>
      <dd class="order-summary__strong">{{ order.total }}</dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>{{ labels.address }}</dt>
      <dd>{{ order.deliveryAddress }}</dd>
    </div>
    <div v-if="order.buyerComment" class="order-summary__row" :style="ROW">
      <dt>{{ labels.comment }}</dt>
      <dd>{{ order.buyerComment }}</dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>{{ labels.version }}</dt>
      <dd><code class="order-summary__code">{{ order.version }}</code></dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>{{ labels.created }}</dt>
      <dd>{{ order.createdAt }}</dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>{{ labels.updated }}</dt>
      <dd>{{ order.updatedAt }}</dd>
    </div>
  </CardPanel>
</template>

<style scoped>
.order-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.order-summary__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.order-summary__row dt {
  flex: 0 0 auto;
  color: var(--c-text-muted);
  font-size: var(--text-sm);
}

.order-summary__row dd {
  min-width: 0;
  margin: 0;
  text-align: right;
  overflow-wrap: anywhere;
}

.order-summary__strong {
  font-weight: 650;
}

.order-summary__code {
  font-family: var(--font-mono);
}

@media (max-width: 519.98px) {
  .order-summary__row {
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
  }

  .order-summary__row dd {
    text-align: left;
  }
}
</style>
