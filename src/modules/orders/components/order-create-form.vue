<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/shared/ui/toast-store'

import AppButton from '@/shared/ui/app-button.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import FormField from '@/shared/ui/form-field.vue'

import type { CreateOrderRequestDto } from '../models/order-dto'
import { isIdempotencyConflict } from '../models/order-error'
import { PAYMENT_METHODS, PAYMENT_METHOD_META, type PaymentMethod } from '../models/order-types'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import { labelFor } from '@/shared/i18n/label-strings'
import { formatMoney } from '../models/order-view-model'
import { useOrderCommands } from '../queries/use-order-commands'
import { useIdempotency } from '../queries/use-idempotency'
import OrderItemsEditor, { type DraftOrderItem } from './order-items-editor.vue'

const router = useRouter()
const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  buyerId: labelFor('Buyer ID', locale.value),
  buyerPlaceholder: tr({ en: 'Owner of the order (UUID)', ru: 'Владелец заказа (UUID)' }, locale.value),
  paymentMethod: labelFor('Payment method', locale.value),
  address: labelFor('Delivery address', locale.value),
  addressPlaceholder: tr({ en: 'Full delivery address', ru: 'Полный адрес доставки' }, locale.value),
  comment: tr({ en: 'Buyer comment (optional)', ru: 'Комментарий покупателя (необязательно)' }, locale.value),
  create: tr({ en: 'Create order', ru: 'Создать заказ' }, locale.value),
  retry: tr({ en: 'Retry (same idempotency key)', ru: 'Повторить (тот же ключ идемпотентности)' }, locale.value),
  preview: tr({ en: 'Preview total', ru: 'Предварительный итог' }, locale.value),
  previewNote: tr(
    { en: '(client preview only — server computes the authoritative total)', ru: '(только предпросмотр на клиенте — итог считает сервер)' },
    locale.value,
  ),
}))
const toast = useToastStore()
const commands = useOrderCommands()
const idem = useIdempotency()

const buyerId = ref('')
const paymentMethod = ref<PaymentMethod>('pay_on_receipt_online')
const deliveryAddress = ref('')
const buyerComment = ref('')
const items = ref<DraftOrderItem[]>([
  { key: 1, product_id: '', name: '', quantity: 1, unit_price: 0, currency: 'RUB' },
])

const submitting = ref(false)
const canRetrySameKey = ref(false)
const serverError = ref<string | null>(null)

const itemsValid = computed(() =>
  items.value.every(
    (item) =>
      item.product_id.trim() !== '' &&
      item.name.trim() !== '' &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      Number.isFinite(item.unit_price) &&
      item.unit_price > 0 &&
      item.currency.trim().toUpperCase() === 'RUB',
  ),
)

const previewTotalMinor = computed(() =>
  Math.round(
    items.value.reduce(
      (sum, item) => sum + (Number.isFinite(item.unit_price) ? item.unit_price : 0) * (Number.isInteger(item.quantity) ? item.quantity : 0),
      0,
    ) * 100,
  ),
)

const formComplete = computed(
  () => buyerId.value.trim() !== '' && deliveryAddress.value.trim() !== '' && items.value.length > 0 && itemsValid.value,
)

/** Build the exact source create contract. Never includes a `total`. */
function buildPayload(): CreateOrderRequestDto {
  return {
    buyer_id: buyerId.value.trim(),
    payment_method: paymentMethod.value,
    items: items.value.map((item) => ({
      product_id: item.product_id.trim(),
      name: item.name.trim(),
      quantity: item.quantity,
      unit_price: Math.round(item.unit_price * 100),
      currency: item.currency.trim().toUpperCase() || 'RUB',
    })),
    delivery_address: deliveryAddress.value.trim(),
    buyer_comment: buyerComment.value.trim() || undefined,
  }
}

async function submit(): Promise<void> {
  if (!formComplete.value || submitting.value) return
  submitting.value = true
  serverError.value = null
  canRetrySameKey.value = false

  const payload = buildPayload()
  const key = idem.begin(payload)

  try {
    const created = await commands.createOrder.mutateAsync({ body: payload, idempotencyKey: key })
    idem.resolveOutcome()
    toast.push({
      tone: 'success',
      message:
        locale.value === 'ru'
          ? `Заказ ${created.id.slice(0, 8)} создан.`
          : `Order ${created.id.slice(0, 8)} was created.`,
    })
    await router.push({ path: `/orders/${created.id}` })
  } catch (error) {
    if (isIdempotencyConflict(error)) {
      // The backend gave a definitive response, so this logical attempt is
      // resolved and the next attempt must get a fresh key.
      idem.resolveOutcome()
      serverError.value = tr(
        {
          en: 'This idempotency key was already used with a different request.',
          ru: 'Этот ключ идемпотентности уже использовался с другим запросом.',
        },
        locale.value,
      )
    } else if (typeof error === 'object' && error !== null && 'kind' in error) {
      const kind = (error as { kind: string; message?: string }).kind
      if (kind === 'network' || kind === 'timeout') {
        // Unknown outcome: DO NOT resolve the attempt. `begin(payload)` will
        // reuse the same key while the payload is unchanged, exactly as the
        // backend idempotency contract requires.
        canRetrySameKey.value = true
        serverError.value =
          (error as { message?: string }).message ??
          tr({ en: 'Request outcome unknown.', ru: 'Исход запроса неизвестен.' }, locale.value)
      } else {
        idem.resolveOutcome()
        serverError.value =
          (error as { message?: string }).message ??
          tr({ en: 'The order could not be created.', ru: 'Не удалось создать заказ.' }, locale.value)
      }
    } else {
      // An unexpected client-side failure is not a safe automatic retry case.
      idem.resolveOutcome()
      serverError.value = tr(
        { en: 'The order could not be created.', ru: 'Не удалось создать заказ.' },
        locale.value,
      )
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <CardPanel class="order-create">
    <form novalidate @submit.prevent="submit">
      <div class="order-create__fields">
        <FormField :label="labels.buyerId" control-for="order-buyer" required :error="buyerId.trim() ? undefined : ''">
          <input
            id="order-buyer"
            v-model="buyerId"
            type="text"
            autocomplete="off"
            :placeholder="labels.buyerPlaceholder"
            data-testid="order-buyer"
          />
        </FormField>

        <FormField :label="labels.paymentMethod" control-for="order-payment" required>
          <select id="order-payment" v-model="paymentMethod" data-testid="order-payment">
            <option v-for="method in PAYMENT_METHODS" :key="method" :value="method">
              {{ labelFor(PAYMENT_METHOD_META[method].label, locale) }}
            </option>
          </select>
        </FormField>
      </div>

      <section class="order-create__section">
        <h3>Items</h3>
        <OrderItemsEditor v-model:items="items" />
      </section>

      <div class="order-create__fields">
        <FormField :label="labels.address" control-for="order-address" required :error="deliveryAddress.trim() ? undefined : ''">
          <textarea
            id="order-address"
            v-model="deliveryAddress"
            rows="2"
            :placeholder="labels.addressPlaceholder"
            data-testid="order-address"
          />
        </FormField>
        <FormField :label="labels.comment" control-for="order-comment" helper="">
          <input
            id="order-comment"
            v-model="buyerComment"
            type="text"
            autocomplete="off"
            data-testid="order-comment"
          />
        </FormField>
      </div>

      <p v-if="serverError" class="order-create__error" role="alert" data-testid="order-error">
        {{ serverError }}
      </p>

      <div class="order-create__footer">
        <div class="order-create__preview">
          {{ labels.preview }}: <strong>{{ formatMoney(previewTotalMinor, 'RUB') }}</strong>
          <span class="order-create__preview-note">{{ labels.previewNote }}</span>
        </div>
        <div class="order-create__actions">
          <AppButton v-if="canRetrySameKey" variant="secondary" type="button" :loading="submitting" @click="submit">
            {{ labels.retry }}
          </AppButton>
          <AppButton type="submit" :disabled="!formComplete" :loading="submitting" data-testid="order-create-submit">
            {{ labels.create }}
          </AppButton>
        </div>
      </div>
    </form>
  </CardPanel>
</template>

<style scoped>
.order-create__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.order-create input,
.order-create select,
.order-create textarea {
  width: 100%;
  padding: 8px var(--space-2);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-sm);
  font-family: inherit;
}

.order-create__section {
  margin-bottom: var(--space-4);
}

.order-create__section h3 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-md);
}

.order-create__error {
  padding: var(--space-3);
  border: 1px solid color-mix(in srgb, var(--c-danger) 45%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--c-danger) 10%, transparent);
  color: var(--c-danger);
  font-size: var(--text-sm);
}

.order-create__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.order-create__preview-note {
  color: var(--c-text-muted);
  font-size: var(--text-xs);
}

.order-create__actions {
  display: flex;
  gap: var(--space-2);
}
</style>
