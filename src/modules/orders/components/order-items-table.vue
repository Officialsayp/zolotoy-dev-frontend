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

    <div class="order-items__cards" role="list" aria-label="Item snapshots as of purchase">
      <article v-for="item in items" :key="item.id" class="order-items__card" role="listitem">
        <div class="order-items__card-name">{{ item.name }}</div>
        <dl class="order-items__details">
          <div class="order-items__detail order-items__detail--wide">
            <dt>Product ID</dt>
            <dd><CodeValue :value="item.productId" /></dd>
          </div>
          <div class="order-items__detail">
            <dt>Quantity</dt>
            <dd>{{ item.quantity }}</dd>
          </div>
          <div class="order-items__detail">
            <dt>Unit price</dt>
            <dd>{{ item.unitPrice }}</dd>
          </div>
          <div class="order-items__detail">
            <dt>Total</dt>
            <dd class="order-items__strong">{{ item.totalPrice }}</dd>
          </div>
        </dl>
      </article>
    </div>
  </CardPanel>
</template>

<style scoped>
.order-items__scroll {
  overflow-x: auto;
}

.order-items__cards {
  display: none;
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
  table-layout: fixed;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.order-items__table th,
.order-items__table td {
  min-width: 0;
  padding: var(--space-3);
  border-bottom: 1px solid var(--c-border);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.order-items__table thead th {
  color: var(--c-text-muted);
  font-weight: 600;
}

.order-items__num {
  text-align: right !important;
}

.order-items__name,
.order-items__card-name {
  font-weight: 600;
}

.order-items__strong {
  font-weight: 650;
}

@media (max-width: 1199.98px) {
  .order-items__scroll {
    display: none;
  }

  .order-items__cards {
    display: block;
  }

  .order-items__card {
    padding: var(--space-4);
  }

  .order-items__card + .order-items__card {
    border-top: 1px solid var(--c-border);
  }

  .order-items__card-name {
    overflow-wrap: anywhere;
  }

  .order-items__details {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    margin: var(--space-3) 0 0;
  }

  .order-items__detail {
    min-width: 0;
  }

  .order-items__detail--wide {
    grid-column: 1 / -1;
  }

  .order-items__detail dt {
    color: var(--c-text-muted);
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .order-items__detail dt,
  .order-items__detail dd {
    margin: 0;
  }

  .order-items__detail dd {
    margin-top: 2px;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 599.98px) {
  .order-items__details {
    grid-template-columns: 1fr;
  }

  .order-items__detail--wide {
    grid-column: auto;
  }
}
</style>
