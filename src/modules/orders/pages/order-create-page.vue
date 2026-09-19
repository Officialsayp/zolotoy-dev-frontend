<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'

import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import OrderCreateForm from '../components/order-create-form.vue'

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'Create order', ru: 'Создание заказа' }, locale.value),
  subtitle: tr(
    {
      en: 'New aggregate with item/price snapshots and a chosen online payment method. Total is computed by the server, never submitted by the client.',
      ru: 'Новый агрегат со снимками позиций/цен и выбранным онлайн-способом оплаты. Итог считает сервер, клиент его не отправляет.',
    },
    locale.value,
  ),
  back: tr({ en: 'Back to orders', ru: 'К списку заказов' }, locale.value),
}))
</script>

<template>
  <section class="order-create-page">
    <header class="order-create-page__header">
      <div>
        <h2 class="order-create-page__title">{{ labels.title }}</h2>
        <p class="order-create-page__subtitle">{{ labels.subtitle }}</p>
      </div>
      <RouterLink to="/orders" class="order-create-page__back">
        <ArrowLeft aria-hidden="true" /> {{ labels.back }}
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
