<script setup lang="ts">
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import { PAYMENT_METHOD_META } from '../models/order-types'
import type { OrderRowView } from '../models/order-view-model'
import OrderStatusBadge from './order-status-badge.vue'
import PaymentStatusBadge from './payment-status-badge.vue'

defineProps<{ rows: OrderRowView[] }>()
</script>

<template>
  <CardPanel class="order-list" padding="none">
    <div class="order-list__scroll">
      <table class="order-list__table">
        <caption class="order-list__caption">Orders, newest first (keyset pagination)</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Created</th>
            <th scope="col">Payment</th>
            <th scope="col" class="order-list__num">Total</th>
            <th scope="col">Order status</th>
            <th scope="col">Payment status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <RouterLink :to="`/orders/${row.id}`" class="order-list__link">
                <CodeValue :value="row.id" />
              </RouterLink>
            </td>
            <td>{{ row.createdAt }}</td>
            <td>{{ PAYMENT_METHOD_META[row.paymentMethod].label }}</td>
            <td class="order-list__num order-list__strong">{{ row.total }}</td>
            <td><OrderStatusBadge :status="row.orderStatus" /></td>
            <td><PaymentStatusBadge :status="row.paymentStatus" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </CardPanel>
</template>

<style scoped>
.order-list__scroll {
  overflow-x: auto;
}

.order-list__caption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.order-list__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  white-space: nowrap;
}

.order-list__table th,
.order-list__table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--c-border);
  text-align: left;
  vertical-align: middle;
}

.order-list__table thead th {
  color: var(--c-text-muted);
  font-weight: 600;
}

.order-list__num {
  text-align: right !important;
}

.order-list__strong {
  font-weight: 650;
}

.order-list__link {
  color: inherit;
  text-decoration: none;
}

.order-list__link:hover {
  color: var(--c-accent);
}
</style>
