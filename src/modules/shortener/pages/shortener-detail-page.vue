<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAppStore } from '@/app/stores/app-store'
import AppButton from '@/shared/ui/app-button.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import CodeValue from '@/shared/ui/code-value.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'

import ShortenerAnalyticsPanel from '../components/shortener-analytics-panel.vue'
import ShortenerHelpPanel from '../components/shortener-help-panel.vue'
import ShortenerManagementActions from '../components/shortener-management-actions.vue'
import ShortenerStatusBadge from '../components/shortener-status-badge.vue'
import {
  useDeleteShortLinkMutation,
  useShortLinkAnalyticsQuery,
  useShortLinkQuery,
} from '../queries/use-shortener-queries'
import { formatDateTime } from '../utils/shortener-format'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'

/**
 * Link detail + analytics (MASTER_FRONTEND_PLAN §17.2/§17.6). Uses the backend
 * `short_url` verbatim, links out to Grafana/performance docs, and hosts the
 * management actions. `Open short URL` is real browser navigation in live mode
 * and an honestly-labelled simulation in mock mode.
 */

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'Link detail', ru: 'Детали ссылки' }, locale.value),
  subtitle: tr(
    { en: 'Management metadata, redirect path and click analytics.', ru: 'Метаданные управления, путь редиректа и аналитика кликов.' },
    locale.value,
  ),
  back: tr({ en: 'Back to links', ru: 'К списку ссылок' }, locale.value),
  denied: tr({ en: 'Access denied', ru: 'Доступ запрещён' }, locale.value),
  deniedMsg: tr(
    { en: 'This link requires access that the backend denied (403).', ru: 'Для этой ссылки бэкенд отклонил доступ (403).' },
    locale.value,
  ),
  notFound: tr({ en: 'Link not found', ru: 'Ссылка не найдена' }, locale.value),
  loadError: tr({ en: 'Unable to load link', ru: 'Не удалось загрузить ссылку' }, locale.value),
  metadata: tr({ en: 'Link metadata', ru: 'Метаданные ссылки' }, locale.value),
  shortUrl: tr({ en: 'Short URL', ru: 'Короткий URL' }, locale.value),
  open: tr({ en: 'Open', ru: 'Открыть' }, locale.value),
  simulate: tr({ en: 'Simulate redirect', ru: 'Симулировать редирект' }, locale.value),
  code: tr({ en: 'Code', ru: 'Код' }, locale.value),
  originalUrl: tr({ en: 'Original URL', ru: 'Исходный URL' }, locale.value),
  status: tr({ en: 'Status', ru: 'Статус' }, locale.value),
  expires: tr({ en: 'Expires', ru: 'Истекает' }, locale.value),
  created: tr({ en: 'Created', ru: 'Создана' }, locale.value),
  updated: tr({ en: 'Updated', ru: 'Обновлена' }, locale.value),
  version: tr({ en: 'Version', ru: 'Версия' }, locale.value),
  emptyTitle: tr({ en: 'No link data', ru: 'Нет данных ссылки' }, locale.value),
  emptyDesc: tr({ en: 'The API returned no content.', ru: 'API вернул пустой ответ.' }, locale.value),
}))

const mockNote = computed(() =>
  tr(
    {
      en: 'Mock mode bypasses the short host and opens the original URL directly. Live mode opens the backend-returned short URL and exercises the real HTTP redirect.',
      ru: 'В mock-режиме короткий хост обходится и открывается исходный URL напрямую. В live-режиме открывается возвращённый бэкендом короткий URL с реальным HTTP-редиректом.',
    },
    locale.value,
  ),
)

const linkId = computed(() => String(route.params.linkId ?? ''))

const query = useShortLinkQuery(linkId)
const analyticsQuery = useShortLinkAnalyticsQuery(linkId)
const deleteMutation = useDeleteShortLinkMutation()

const isDenied = computed(() => isErrorKind(query.error.value, 'authorization'))
const isNotFound = computed(() => isErrorKind(query.error.value, 'not-found'))

function isErrorKind(error: unknown, kind: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { kind?: string }).kind === kind
  )
}

const mainMessage = computed(() => {
  const error = query.error.value
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'The link could not be loaded.'
})

async function onDelete(): Promise<void> {
  try {
    await deleteMutation.mutateAsync(linkId.value)
    void router.push('/shortener')
  } catch {
    // `deleteMutation.error` renders the normalized failure.
  }
}

const deleteMessage = computed(() => {
  const error = deleteMutation.error.value
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return tr({ en: 'The link could not be deleted.', ru: 'Ссылку не удалось удалить.' }, locale.value)
})
</script>

<template>
  <section class="shortener-detail">
    <header class="shortener-detail__header">
      <div>
        <h2 class="shortener-detail__title">{{ labels.title }}</h2>
        <p class="shortener-detail__subtitle">{{ labels.subtitle }}</p>
      </div>
      <AppButton variant="secondary" size="sm" @click="router.push('/shortener')">{{ labels.back }}</AppButton>
    </header>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="6" :columns="2" />

    <ErrorState
      v-else-if="isDenied"
      :title="labels.denied"
      :message="labels.deniedMsg"
    />

    <ErrorState
      v-else-if="isNotFound"
      :title="labels.notFound"
      :message="
        tr({ en: `No short link exists for ${linkId}.`, ru: `Короткой ссылки ${linkId} не существует.` }, locale)
      "
    />

    <ErrorState
      v-else-if="query.isError.value"
      :title="labels.loadError"
      :message="mainMessage"
      :on-retry="() => query.refetch()"
    />

    <template v-else-if="query.data.value">
      <CardPanel class="shortener-detail__meta">
        <h3 class="shortener-detail__meta-title">{{ labels.metadata }}</h3>
        <dl class="shortener-detail__list">
          <div class="shortener-detail__row">
            <dt>{{ labels.shortUrl }}</dt>
            <dd>
              <span v-if="query.data.value.short_url" class="shortener-detail__short">
                <CodeValue :value="query.data.value.short_url" />
                <a
                  v-if="query.data.value.short_url && !app.isMock"
                  :href="query.data.value.short_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="shortener-detail__open"
                  data-testid="open-short-url"
                >
                  {{ labels.open }}
                </a>
                <a
                  v-else-if="query.data.value.short_url && app.isMock"
                  :href="query.data.value.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="shortener-detail__open"
                  data-testid="simulate-short-url"
                >
                  {{ labels.simulate }}
                </a>
              </span>
              <code v-else class="shortener-detail__mono">{{ query.data.value.code }}</code>
            </dd>
          </div>
          <div class="shortener-detail__row">
            <dt>{{ labels.code }}</dt>
            <dd><code class="shortener-detail__mono">{{ query.data.value.code }}</code></dd>
          </div>
          <div class="shortener-detail__row">
            <dt>{{ labels.originalUrl }}</dt>
            <dd class="shortener-detail__wrap">{{ query.data.value.url }}</dd>
          </div>
          <div class="shortener-detail__row">
            <dt>{{ labels.status }}</dt>
            <dd>
              <ShortenerStatusBadge
                :status="query.data.value.status"
                :expires-at="query.data.value.expires_at"
              />
            </dd>
          </div>
          <div class="shortener-detail__row">
            <dt>{{ labels.expires }}</dt>
            <dd>{{ formatDateTime(query.data.value.expires_at) }}</dd>
          </div>
          <div class="shortener-detail__row">
            <dt>{{ labels.created }}</dt>
            <dd>{{ formatDateTime(query.data.value.created_at) }}</dd>
          </div>
          <div v-if="query.data.value.updated_at" class="shortener-detail__row">
            <dt>{{ labels.updated }}</dt>
            <dd>{{ formatDateTime(query.data.value.updated_at) }}</dd>
          </div>
          <div v-if="query.data.value.version != null" class="shortener-detail__row">
            <dt>{{ labels.version }}</dt>
            <dd>{{ query.data.value.version }}</dd>
          </div>
        </dl>
        <p v-if="app.isMock" class="shortener-detail__mock-note">{{ mockNote }}</p>
      </CardPanel>

      <ShortenerManagementActions
        :link="query.data.value"
        :delete-busy="deleteMutation.isPending.value"
        @delete="onDelete"
      />
      <p v-if="deleteMutation.error.value" class="shortener-detail__error" role="alert" data-testid="delete-error">
        {{ deleteMessage }}
      </p>

      <ShortenerAnalyticsPanel
        :analytics="analyticsQuery.data.value"
        :loading="analyticsQuery.isLoading.value"
        :has-error="analyticsQuery.isError.value"
      />

      <ShortenerHelpPanel />
    </template>

    <EmptyState v-else :title="labels.emptyTitle" :description="labels.emptyDesc" />
  </section>
</template>

<style scoped>
.shortener-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.shortener-detail__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.shortener-detail__title {
  margin: 0;
  font-size: var(--text-2xl);
}

.shortener-detail__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--c-text-muted);
}

.shortener-detail__meta-title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-md);
}

.shortener-detail__list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.shortener-detail__row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: var(--space-2);
  align-items: baseline;
  font-size: var(--text-sm);
}

.shortener-detail__row dt {
  color: var(--c-text-subtle);
}

.shortener-detail__row dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.shortener-detail__wrap {
  overflow-wrap: anywhere;
}

.shortener-detail__mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}

.shortener-detail__short {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.shortener-detail__open {
  color: var(--c-accent);
  font-weight: 600;
  font-size: var(--text-xs);
}

.shortener-detail__mock-note {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--c-text-subtle);
}

.shortener-detail__error {
  margin: 0;
  color: var(--c-danger);
  font-size: var(--text-sm);
}

@media (max-width: 520px) {
  .shortener-detail__row {
    grid-template-columns: 1fr;
    gap: 2px;
    align-items: start;
  }
}
</style>
