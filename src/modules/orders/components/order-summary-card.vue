<script setup lang="ts">
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import type { OrderDetailView } from '../models/order-view-model'

defineProps<{ order: OrderDetailView }>()

/** Row helper renders a key/value pair. */
const ROW = { display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' } as const
</script>

<template>
  <CardPanel class="order-summary">
    <div class="order-summary__row" :style="ROW">
      <dt>Buyer ID</dt>
      <dd><CodeValue :value="order.buyerId" /></dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>Total</dt>
      <dd class="order-summary__strong">{{ order.total }}</dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>Delivery address</dt>
      <dd>{{ order.deliveryAddress }}</dd>
    </div>
    <div v-if="order.buyerComment" class="order-summary__row" :style="ROW">
      <dt>Buyer comment</dt>
      <dd>{{ order.buyerComment }}</dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>Aggregate version</dt>
      <dd><code class="order-summary__code">{{ order.version }}</code></dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>Created</dt>
      <dd>{{ order.createdAt }}</dd>
    </div>
    <div class="order-summary__row" :style="ROW">
      <dt>Updated</dt>
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
