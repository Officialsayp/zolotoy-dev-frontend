<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { useAppStore } from '@/app/stores/app-store'
import CodeValue from '@/shared/ui/code-value.vue'

import type { ShortLinkDto } from '../models/shortener-dto'
import { formatDateTime, truncateUrl } from '../utils/shortener-format'
import { computed } from 'vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import ShortenerStatusBadge from './shortener-status-badge.vue'

defineProps<{
  links: ShortLinkDto[]
}>()

const app = useAppStore()
const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  details: tr({ en: 'Details', ru: 'Подробнее' }, locale.value),
  mockTitle: tr({ en: 'Mock mode: open the original target directly', ru: 'Mock-режим: открываем исходный адрес напрямую' }, locale.value),
  columns: {
    short: tr({ en: 'Short URL', ru: 'Короткая ссылка' }, locale.value),
    original: tr({ en: 'Original URL', ru: 'Исходный адрес' }, locale.value),
    status: tr({ en: 'Status', ru: 'Статус' }, locale.value),
    expires: tr({ en: 'Expires', ru: 'Истекает' }, locale.value),
    created: tr({ en: 'Created', ru: 'Создана' }, locale.value),
    actions: tr({ en: 'Actions', ru: 'Действия' }, locale.value),
  },
}))
</script>

<template>
  <div class="shortener-list" data-testid="shortener-list">
    <div class="shortener-list__head" aria-hidden="true">
      <span>{{ labels.columns.short }}</span>
      <span>{{ labels.columns.original }}</span>
      <span>{{ labels.columns.status }}</span>
      <span>{{ labels.columns.expires }}</span>
      <span>{{ labels.columns.created }}</span>
      <span class="shortener-list__head-actions">{{ labels.columns.actions }}</span>
    </div>

    <div
      v-for="link in links"
      :key="link.id"
      class="shortener-list__row"
      :data-testid="`link-row-${link.code}`"
    >
      <div class="shortener-list__cell shortener-list__cell--short" :data-label="labels.columns.short">
        <CodeValue v-if="link.short_url" :value="link.short_url" />
        <code v-else class="shortener-list__plain">{{ link.code }}</code>
      </div>

      <div
        class="shortener-list__cell shortener-list__cell--url"
        :data-label="labels.columns.original"
        :title="link.url"
      >
        <span class="shortener-list__truncate">{{ truncateUrl(link.url) }}</span>
      </div>

      <div class="shortener-list__cell" :data-label="labels.columns.status">
        <ShortenerStatusBadge :status="link.status" :expires-at="link.expires_at" />
      </div>

      <div class="shortener-list__cell shortener-list__cell--muted" :data-label="labels.columns.expires">
        {{ formatDateTime(link.expires_at) }}
      </div>

      <div class="shortener-list__cell shortener-list__cell--muted" :data-label="labels.columns.created">
        {{ formatDateTime(link.created_at) }}
      </div>

      <div class="shortener-list__cell shortener-list__cell--actions shortener-list__actions" :data-label="labels.columns.actions">
        <RouterLink :to="`/shortener/${link.id}`" class="shortener-list__link">{{ labels.details }}</RouterLink>
        <a
          v-if="link.short_url && !app.isMock"
          :href="link.short_url"
          target="_blank"
          rel="noopener noreferrer"
          class="shortener-list__link"
        >
          Open
        </a>
        <a
          v-else-if="link.short_url && app.isMock"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="shortener-list__link"
          :title="labels.mockTitle"
        >
          Simulate
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shortener-list__head {
  display: none;
}

.shortener-list__head,
.shortener-list__row {
  display: grid;
  gap: var(--space-2) var(--space-3);
  align-items: center;
  font-size: var(--text-sm);
}

.shortener-list__row {
  padding: var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--surface-card);
  margin-bottom: var(--space-2);
}

.shortener-list__cell {
  min-width: 0;
  overflow-wrap: anywhere;
}

.shortener-list__cell--muted {
  color: var(--c-text-muted);
}

.shortener-list__truncate {
  display: block;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shortener-list__plain {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}

.shortener-list__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.shortener-list__link {
  color: var(--c-accent);
  font-weight: 600;
  font-size: var(--text-sm);
  text-decoration: none;
}

/* Phones, tablets and 960–1279px desktop-shell widths use stacked records.
   The desktop sidebar leaves too little effective content width for six columns there. */
@media (max-width: 1279.98px) {
  .shortener-list__head {
    display: none;
  }

  .shortener-list__row {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .shortener-list__cell::before {
    content: attr(data-label);
    display: block;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--c-text-subtle);
    margin-bottom: 2px;
  }

  .shortener-list__cell--short::before {
    content: 'Short URL';
  }
}

/* Wide desktop: compact single-row grid. */
@media (min-width: 1280px) {
  .shortener-list__head,
  .shortener-list__row {
    grid-template-columns: minmax(170px, 2fr) minmax(160px, 3fr) 110px 130px 130px auto;
  }

  .shortener-list__head {
    display: grid;
    padding: 0 var(--space-3);
    color: var(--c-text-subtle);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .shortener-list__row {
    border: 1px solid var(--c-border);
    border-radius: var(--radius-md);
  }

  .shortener-list__cell--actions.shortener-list__actions {
    justify-content: flex-end;
  }
}
</style>
