<script setup lang="ts">
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import { PAYMENT_METHOD_META } from '../models/order-types'
import type { OrderRowView } from '../models/order-view-model'
import OrderStatusBadge from './order-status-badge.vue'
import PaymentStatusBadge from './payment-status-badge.vue'

defineProps<{ rows: OrderRowView[] }>()

function shortId(value: string): string {
  if (value.length <= 18) return value
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}
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
                <CodeValue :value="row.id" :display="shortId(row.id)" />
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

    <div class="order-list__cards" role="list" aria-label="Orders, newest first">
      <article v-for="row in rows" :key="row.id" class="order-list__card" role="listitem">
        <header class="order-list__card-header">
          <div class="order-list__card-order">
            <span class="order-list__field-label">Order</span>
            <RouterLink :to="`/orders/${row.id}`" class="order-list__link">
              <CodeValue :value="row.id" :display="shortId(row.id)" />
            </RouterLink>
          </div>
          <OrderStatusBadge :status="row.orderStatus" />
        </header>

        <dl class="order-list__details">
          <div class="order-list__detail">
            <dt>Created</dt>
            <dd>{{ row.createdAt }}</dd>
          </div>
          <div class="order-list__detail">
            <dt>Total</dt>
            <dd class="order-list__strong">{{ row.total }}</dd>
          </div>
          <div class="order-list__detail order-list__detail--wide">
            <dt>Payment method</dt>
            <dd>{{ PAYMENT_METHOD_META[row.paymentMethod].label }}</dd>
          </div>
          <div class="order-list__detail">
            <dt>Order status</dt>
            <dd><OrderStatusBadge :status="row.orderStatus" /></dd>
          </div>
          <div class="order-list__detail">
            <dt>Payment status</dt>
            <dd><PaymentStatusBadge :status="row.paymentStatus" /></dd>
          </div>
        </dl>
      </article>
    </div>
  </CardPanel>
</template>

<style scoped>
.order-list__scroll {
  overflow-x: auto;
}

.order-list__cards {
  display: none;
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
  table-layout: fixed;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.order-list__table th,
.order-list__table td {
  min-width: 0;
  padding: var(--space-3);
  border-bottom: 1px solid var(--c-border);
  text-align: left;
  vertical-align: middle;
  overflow-wrap: anywhere;
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
  min-width: 0;
}

.order-list__link:hover {
  color: var(--c-accent);
}

@media (max-width: 1279.98px) {
  .order-list__scroll {
    display: none;
  }

  .order-list__cards {
    display: block;
  }

  .order-list__card {
    padding: var(--space-4);
  }

  .order-list__card + .order-list__card {
    border-top: 1px solid var(--c-border);
  }

  .order-list__card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .order-list__card-order {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .order-list__field-label,
  .order-list__detail dt {
    color: var(--c-text-muted);
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .order-list__details {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3) var(--space-4);
    margin: var(--space-4) 0 0;
  }

  .order-list__detail {
    min-width: 0;
  }

  .order-list__detail--wide {
    grid-column: 1 / -1;
  }

  .order-list__detail dt,
  .order-list__detail dd {
    margin: 0;
  }

  .order-list__detail dd {
    margin-top: 2px;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 479.98px) {
  .order-list__details {
    grid-template-columns: 1fr;
  }

  .order-list__detail--wide {
    grid-column: auto;
  }
}
</style>
