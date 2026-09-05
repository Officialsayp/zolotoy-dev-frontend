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

/**
 * Link detail + analytics (MASTER_FRONTEND_PLAN §17.2/§17.6). Uses the backend
 * `short_url` verbatim, links out to Grafana/performance docs, and hosts the
 * management actions. `Open short URL` is real browser navigation in live mode
 * and an honestly-labelled simulation in mock mode.
 */

const route = useRoute()
const router = useRouter()
const app = useAppStore()

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
  return 'The link could not be deleted.'
})
</script>

<template>
  <section class="shortener-detail">
    <header class="shortener-detail__header">
      <div>
        <h2 class="shortener-detail__title">Link detail</h2>
        <p class="shortener-detail__subtitle">
          Management metadata, redirect path and click analytics.
        </p>
      </div>
      <AppButton variant="secondary" size="sm" @click="router.push('/shortener')">Back to links</AppButton>
    </header>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="6" :columns="2" />

    <ErrorState
      v-else-if="isDenied"
      title="Access denied"
      :message="'This link requires access that the backend denied (403).'"
    />

    <ErrorState
      v-else-if="isNotFound"
      title="Link not found"
      :message="`No short link exists for ${linkId}.`"
    />

    <ErrorState
      v-else-if="query.isError.value"
      title="Unable to load link"
      :message="mainMessage"
      :on-retry="() => query.refetch()"
    />

    <template v-else-if="query.data.value">
      <CardPanel class="shortener-detail__meta">
        <h3 class="shortener-detail__meta-title">Link metadata</h3>
        <dl class="shortener-detail__list">
          <div class="shortener-detail__row">
            <dt>Short URL</dt>
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
                  Open
                </a>
                <a
                  v-else-if="query.data.value.short_url && app.isMock"
                  :href="query.data.value.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="shortener-detail__open"
                  data-testid="simulate-short-url"
                >
                  Simulate redirect
                </a>
              </span>
              <code v-else class="shortener-detail__mono">{{ query.data.value.code }}</code>
            </dd>
          </div>
          <div class="shortener-detail__row">
            <dt>Code</dt>
            <dd><code class="shortener-detail__mono">{{ query.data.value.code }}</code></dd>
          </div>
          <div class="shortener-detail__row">
            <dt>Original URL</dt>
            <dd class="shortener-detail__wrap">{{ query.data.value.url }}</dd>
          </div>
          <div class="shortener-detail__row">
            <dt>Status</dt>
            <dd>
              <ShortenerStatusBadge
                :status="query.data.value.status"
                :expires-at="query.data.value.expires_at"
              />
            </dd>
          </div>
          <div class="shortener-detail__row">
            <dt>Expires</dt>
            <dd>{{ formatDateTime(query.data.value.expires_at) }}</dd>
          </div>
          <div class="shortener-detail__row">
            <dt>Created</dt>
            <dd>{{ formatDateTime(query.data.value.created_at) }}</dd>
          </div>
          <div v-if="query.data.value.updated_at" class="shortener-detail__row">
            <dt>Updated</dt>
            <dd>{{ formatDateTime(query.data.value.updated_at) }}</dd>
          </div>
          <div v-if="query.data.value.version != null" class="shortener-detail__row">
            <dt>Version</dt>
            <dd>{{ query.data.value.version }}</dd>
          </div>
        </dl>
        <p v-if="app.isMock" class="shortener-detail__mock-note">
          Mock mode bypasses the short host and opens the original URL directly.
          Live mode opens the backend-returned short URL and exercises the real HTTP redirect.
        </p>
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

    <EmptyState v-else title="No link data" description="The API returned no content." />
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
