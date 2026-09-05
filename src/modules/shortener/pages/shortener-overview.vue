<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/shared/ui/app-button.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'

import ShortenerCreateForm from '../components/shortener-create-form.vue'
import ShortenerHelpPanel from '../components/shortener-help-panel.vue'
import ShortenerList from '../components/shortener-list.vue'
import type { ShortLinkListQuery } from '../models/shortener-dto'
import { useShortLinksListQuery } from '../queries/use-shortener-queries'

/**
 * URL Shortener management dashboard (MASTER_FRONTEND_PLAN §17.2). Combines the
 * create card and the keyset-paginated link list; the create form stays on this
 * page (no separate `/new` route). After a successful create we navigate to the
 * created link's detail using the authoritative response id.
 */

const PAGE_LIMIT = 8

const router = useRouter()

const cursor = ref<string | undefined>(undefined)
const cursorStack = ref<string[]>([])

const listQuery = computed<ShortLinkListQuery>(() => ({ cursor: cursor.value, limit: PAGE_LIMIT }))
const query = useShortLinksListQuery(listQuery)

const rows = computed(() => (query.data.value ? query.data.value.items : []))
const hasNext = computed(() => Boolean(query.data.value?.has_more))

const isDenied = computed(() => isErrorKind('authorization'))

function isErrorKind(kind: string): boolean {
  const error = query.error.value
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { kind?: string }).kind === kind
  )
}

const listMessage = computed(() => {
  if (isDenied.value) return 'You do not have access to these links (403).'
  const error = query.error.value
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'Links could not be loaded.'
})

function nextPage(): void {
  const next = query.data.value?.next_cursor
  if (!next) return
  cursorStack.value = [...cursorStack.value, cursor.value ?? '']
  cursor.value = next
}

function previousPage(): void {
  const prev = cursorStack.value.pop()
  cursor.value = prev || undefined
}

function onCreated(linkId: string): void {
  void router.push(`/shortener/${linkId}`)
}
</script>

<template>
  <section class="shortener-overview">
    <header class="shortener-overview__header">
      <div>
        <h2 class="shortener-overview__title">URL Shortener</h2>
        <p class="shortener-overview__subtitle">
          Hot redirect path, Redis cache-aside, singleflight and bounded analytics.
        </p>
      </div>
    </header>

    <ShortenerCreateForm @created="onCreated" />

    <div class="shortener-overview__list-head">
      <h3 class="shortener-overview__list-title">Your links</h3>
    </div>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="5" :columns="5" />

    <ErrorState
      v-else-if="query.isError.value"
      :title="isDenied ? 'Access denied' : 'Unable to load links'"
      :message="listMessage"
      :on-retry="() => query.refetch()"
    />

    <EmptyState
      v-else-if="rows.length === 0"
      title="No links in this scenario"
      description="Create a short link above or switch the demo scenario."
    />

    <template v-else>
      <ShortenerList :links="rows" />

      <nav class="shortener-overview__pager" aria-label="Links pagination">
        <AppButton variant="secondary" size="sm" :disabled="cursorStack.length === 0" @click="previousPage">
          Previous
        </AppButton>
        <AppButton variant="secondary" size="sm" :disabled="!hasNext" @click="nextPage">Next</AppButton>
      </nav>
    </template>

    <ShortenerHelpPanel />
  </section>
</template>

<style scoped>
.shortener-overview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.shortener-overview__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.shortener-overview__title {
  margin: 0;
  font-size: var(--text-2xl);
}

.shortener-overview__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--c-text-muted);
}

.shortener-overview__list-head {
  margin-top: var(--space-2);
}

.shortener-overview__list-title {
  margin: 0;
  font-size: var(--text-md);
}

.shortener-overview__pager {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
