<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import { ref } from 'vue'

import AppButton from '@/shared/ui/app-button.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import ConfirmDialog from '@/shared/ui/confirm-dialog.vue'

import type { ShortLinkDto } from '../models/shortener-dto'

/**
 * Management actions (MASTER_FRONTEND_PLAN §17.4).
 *
 * Logical delete IS source-backed (`DELETE /api/v1/links/{id}`) and therefore
 * active, behind a destructive confirmation. Enable/disable would need an agreed
 * PUT contract — the exact PUT request/response fields are still **TBD** — so
 * those actions stay capability-gated (disabled, with the contract reason shown)
 * rather than inventing a generic edit form or a guessed PUT DTO.
 */

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  disable: tr({ en: 'Disable', ru: 'Отключить' }, locale.value),
  enable: tr({ en: 'Enable', ru: 'Включить' }, locale.value),
  delete: tr({ en: 'Delete link', ru: 'Удалить ссылку' }, locale.value),
  deleteTitle: tr({ en: 'Delete this link?', ru: 'Удалить эту ссылку?' }, locale.value),
  title: tr({ en: 'Management actions', ru: 'Управляющие действия' }, locale.value),
  deleteNote: tr({ en: 'Logical delete; requires confirmation.', ru: 'Логическое удаление; требуется подтверждение.' }, locale.value),
  enableTitle: tr({ en: 'Enable requires an agreed PUT contract', ru: 'Включение требует согласованного PUT-контракта' }, locale.value),
  disableTitle: tr({ en: 'Disable requires an agreed PUT contract', ru: 'Отключение требует согласованного PUT-контракта' }, locale.value),
  gateNote: tr(
    {
      en: 'Enable/disable is capability-gated: the exact PUT request/response contract is still TBD, so the frontend does not guess a mutation.',
      ru: 'Включение/отключение ограничено возможностями API: точный PUT-контракт ещё TBD, фронтенд не выдумывает мутацию.',
    },
    locale.value,
  ),
}))

const props = defineProps<{
  link: ShortLinkDto
  deleteBusy?: boolean
}>()

const emit = defineEmits<{ (e: 'delete'): void }>()

const confirmOpen = ref(false)
</script>

<template>
  <CardPanel class="shortener-actions">
    <h3 class="shortener-actions__title">{{ labels.title }}</h3>

    <div class="shortener-actions__row">
      <AppButton variant="danger" data-testid="delete-link" :disabled="deleteBusy" @click="confirmOpen = true">
        {{ labels.delete }}
      </AppButton>
      <span class="shortener-actions__note">{{ labels.deleteNote }}</span>
    </div>

    <div class="shortener-actions__row">
      <AppButton variant="secondary" disabled :title="labels.enableTitle" data-testid="enable-link">
        Enable
      </AppButton>
      <AppButton variant="secondary" disabled :title="labels.disableTitle" data-testid="disable-link">
        Disable
      </AppButton>
      <span class="shortener-actions__note">{{ labels.gateNote }}</span>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      :title="labels.deleteTitle"
      :message="
        tr(
          {
            en: `Deleting ${props.link.code} permanently stops its redirects and invalidates its cache entry on the backend.`,
            ru: `Удаление ${props.link.code} навсегда останавливает редиректы и инвалидирует запись кэша на бэкенде.`,
          },
          locale,
        )
      "
      confirm-label="Delete"
      variant="danger"
      :busy="deleteBusy"
      @confirm="confirmOpen = false; emit('delete')"
      @update:open="confirmOpen = false"
    />
  </CardPanel>
</template>

<style scoped>
.shortener-actions__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-md);
}

.shortener-actions__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-3);
}

.shortener-actions__note {
  font-size: var(--text-xs);
  color: var(--c-text-subtle);
  max-width: 46ch;
}
</style>
