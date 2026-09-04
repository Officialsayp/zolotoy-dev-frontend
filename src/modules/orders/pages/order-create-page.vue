<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

import OrderCreateForm from '../components/order-create-form.vue'
</script>

<template>
  <section class="order-create-page">
    <header class="order-create-page__header">
      <div>
        <h2 class="order-create-page__title">Create order</h2>
        <p class="order-create-page__subtitle">
          New aggregate with item/price snapshots and a chosen online payment method. Total is
          computed by the server, never submitted by the client.
        </p>
      </div>
      <RouterLink to="/orders" class="order-create-page__back">
        <ArrowLeft aria-hidden="true" /> Back to orders
      </RouterLink>
    </header>

    <OrderCreateForm />
  </section>
</template>

<style scoped>
.order-create-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.order-create-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.order-create-page__title {
  margin: 0;
  font-size: var(--text-2xl);
}

.order-create-page__subtitle {
  margin: var(--space-1) 0 0;
  max-width: 68ch;
  color: var(--c-text-muted);
}

.order-create-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--c-accent);
  text-decoration: none;
  font-size: var(--text-sm);
}
</style>
