<script setup lang="ts">
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import type { OrderDetailView } from '../models/order-view-model'

defineProps<{ items: OrderDetailView['items'] }>()
</script>

<template>
  <CardPanel class="order-items" padding="none">
    <div class="order-items__scroll">
      <table class="order-items__table">
        <caption class="order-items__caption">Item snapshots as of purchase (server-authoritative)</caption>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Product ID</th>
            <th scope="col">Qty</th>
            <th scope="col" class="order-items__num">Unit price</th>
            <th scope="col" class="order-items__num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td class="order-items__name">{{ item.name }}</td>
            <td><CodeValue :value="item.productId" /></td>
            <td>{{ item.quantity }}</td>
            <td class="order-items__num">{{ item.unitPrice }}</td>
            <td class="order-items__num order-items__strong">{{ item.totalPrice }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </CardPanel>
</template>

<style scoped>
.order-items__scroll {
  overflow-x: auto;
}

.order-items__caption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.order-items__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  white-space: nowrap;
}

.order-items__table th,
.order-items__table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--c-border);
  text-align: left;
  vertical-align: top;
}

.order-items__table thead th {
  color: var(--c-text-muted);
  font-weight: 600;
}

.order-items__num {
  text-align: right !important;
}

.order-items__name {
  font-weight: 600;
}

.order-items__strong {
  font-weight: 650;
}
</style>
