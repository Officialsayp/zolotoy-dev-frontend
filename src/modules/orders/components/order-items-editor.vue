<script setup lang="ts">
import AppButton from '@/shared/ui/app-button.vue'
import FormField from '@/shared/ui/form-field.vue'

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
  return value.trim() === '' ? `${label} is required.` : undefined
}

function quantityError(value: number): string | undefined {
  return !Number.isInteger(value) || value <= 0 ? 'Quantity must be a positive integer.' : undefined
}

function priceError(value: number): string | undefined {
  return !Number.isFinite(value) || value <= 0 ? 'Unit price must be greater than 0.' : undefined
}
</script>

<template>
  <div class="items-editor">
    <div v-for="(item, i) in items" :key="item.key" class="items-editor__row">
      <div class="items-editor__grid">
        <FormField label="Product ID" :control-for="`idem-pid-${item.key}`" :error="fieldError(item.product_id, 'Product ID')">
          <input
            :id="`idem-pid-${item.key}`"
            :value="item.product_id"
            type="text"
            autocomplete="off"
            placeholder="Catalog product id"
            @input="set(i, { product_id: ($event.target as HTMLInputElement).value })"
          />
        </FormField>
        <FormField label="Product name" :control-for="`idem-name-${item.key}`" :error="fieldError(item.name, 'Product name')">
          <input
            :id="`idem-name-${item.key}`"
            :value="item.name"
            type="text"
            autocomplete="off"
            placeholder="Snapshot name"
            @input="set(i, { name: ($event.target as HTMLInputElement).value })"
          />
        </FormField>
        <FormField label="Quantity" :control-for="`idem-qty-${item.key}`" :error="quantityError(item.quantity)">
          <input
            :id="`idem-qty-${item.key}`"
            :value="String(item.quantity)"
            type="number"
            min="1"
            step="1"
            @input="set(i, { quantity: Number(($event.target as HTMLInputElement).value) })"
          />
        </FormField>
        <FormField label="Unit price (₽)" :control-for="`idem-price-${item.key}`" :error="priceError(item.unit_price)">
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
          label="Currency"
          :control-for="`idem-cur-${item.key}`"
          helper="Order MVP supports RUB only."
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
      <AppButton variant="ghost" size="sm" @click="removeItem(i)">Remove item</AppButton>
    </div>

    <div class="items-editor__add">
      <AppButton variant="secondary" size="sm" @click="addItem">Add item</AppButton>
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
