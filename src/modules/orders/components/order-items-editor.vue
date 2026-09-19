<script setup lang="ts">
import AppButton from '@/shared/ui/app-button.vue'
import FormField from '@/shared/ui/form-field.vue'
import { computed } from 'vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'

export interface DraftOrderItem {
  key: number
  product_id: string
  name: string
  quantity: number
  unit_price: number
  currency: string
}

const props = defineProps<{ items: DraftOrderItem[] }>()

const emit = defineEmits<{ (e: 'update:items', items: DraftOrderItem[]): void }>()

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  productId: tr({ en: 'Product ID', ru: 'ID товара' }, locale.value),
  productPlaceholder: tr({ en: 'Catalog product id', ru: 'ID товара из каталога' }, locale.value),
  productName: tr({ en: 'Product name', ru: 'Название товара' }, locale.value),
  namePlaceholder: tr({ en: 'Snapshot name', ru: 'Название (снимок)' }, locale.value),
  quantity: tr({ en: 'Quantity', ru: 'Количество' }, locale.value),
  unitPrice: tr({ en: 'Unit price (₽)', ru: 'Цена за единицу (₽)' }, locale.value),
  currency: tr({ en: 'Currency', ru: 'Валюта' }, locale.value),
  currencyHelper: tr({ en: 'Order MVP supports RUB only.', ru: 'MVP заказов поддерживает только RUB.' }, locale.value),
  removeItem: tr({ en: 'Remove item', ru: 'Убрать позицию' }, locale.value),
  addItem: tr({ en: 'Add item', ru: 'Добавить позицию' }, locale.value),
}))

let nextKey = 100

function set(index: number, patch: Partial<DraftOrderItem>): void {
  const next = props.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
  emit('update:items', next)
}

function removeItem(index: number): void {
  emit(
    'update:items',
    props.items.filter((_, i) => i !== index),
  )
}

function addItem(): void {
  const item: DraftOrderItem = {
    key: nextKey++,
    product_id: '',
    name: '',
    quantity: 1,
    unit_price: 0,
    currency: 'RUB',
  }
  emit('update:items', [...props.items, item])
}

/** Lightweight inline validation helpers (backend remains authoritative). */
function fieldError(value: string, label: string): string | undefined {
  return value.trim() === ''
    ? tr({ en: `${label} is required.`, ru: `Поле «${label}» обязательно.` }, locale.value)
    : undefined
}

function quantityError(value: number): string | undefined {
  return !Number.isInteger(value) || value <= 0
    ? tr(
        { en: 'Quantity must be a positive integer.', ru: 'Количество должно быть положительным целым числом.' },
        locale.value,
      )
    : undefined
}

function priceError(value: number): string | undefined {
  return !Number.isFinite(value) || value <= 0
    ? tr(
        { en: 'Unit price must be greater than 0.', ru: 'Цена за единицу должна быть больше 0.' },
        locale.value,
      )
    : undefined
}
</script>

<template>
  <div class="items-editor">
    <div v-for="(item, i) in items" :key="item.key" class="items-editor__row">
      <div class="items-editor__grid">
        <FormField :label="labels.productId" :control-for="`idem-pid-${item.key}`" :error="fieldError(item.product_id, 'Product ID')">
          <input
            :id="`idem-pid-${item.key}`"
            :value="item.product_id"
            type="text"
            autocomplete="off"
            :placeholder="labels.productPlaceholder"
            @input="set(i, { product_id: ($event.target as HTMLInputElement).value })"
          />
        </FormField>
        <FormField :label="labels.productName" :control-for="`idem-name-${item.key}`" :error="fieldError(item.name, 'Product name')">
          <input
            :id="`idem-name-${item.key}`"
            :value="item.name"
            type="text"
            autocomplete="off"
            :placeholder="labels.namePlaceholder"
            @input="set(i, { name: ($event.target as HTMLInputElement).value })"
          />
        </FormField>
        <FormField :label="labels.quantity" :control-for="`idem-qty-${item.key}`" :error="quantityError(item.quantity)">
          <input
            :id="`idem-qty-${item.key}`"
            :value="String(item.quantity)"
            type="number"
            min="1"
            step="1"
            @input="set(i, { quantity: Number(($event.target as HTMLInputElement).value) })"
          />
        </FormField>
        <FormField :label="labels.unitPrice" :control-for="`idem-price-${item.key}`" :error="priceError(item.unit_price)">
          <input
            :id="`idem-price-${item.key}`"
            :value="String(item.unit_price)"
            type="number"
            min="0.01"
            step="0.01"
            @input="set(i, { unit_price: Number(($event.target as HTMLInputElement).value) })"
          />
        </FormField>
        <FormField
          :label="labels.currency"
          :control-for="`idem-cur-${item.key}`"
          :helper="labels.currencyHelper"
        >
          <input
            :id="`idem-cur-${item.key}`"
            value="RUB"
            type="text"
            readonly
            aria-readonly="true"
          />
        </FormField>
      </div>
      <AppButton variant="ghost" size="sm" @click="removeItem(i)">{{ labels.removeItem }}</AppButton>
    </div>

    <div class="items-editor__add">
      <AppButton variant="secondary" size="sm" @click="addItem">{{ labels.addItem }}</AppButton>
    </div>
  </div>
</template>

<style scoped>
.items-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.items-editor__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--c-border);
}

.items-editor__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
}

.items-editor input {
  height: 34px;
  padding: 0 var(--space-2);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-sm);
}

.items-editor__add {
  display: flex;
}
</style>
