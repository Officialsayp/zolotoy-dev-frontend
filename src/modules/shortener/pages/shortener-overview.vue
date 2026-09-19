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
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'

/**
 * URL Shortener management dashboard (MASTER_FRONTEND_PLAN §17.2). Combines the
 * create card and the keyset-paginated link list; the create form stays on this
 * page (no separate `/new` route). After a successful create we navigate to the
 * created link's detail using the authoritative response id.
 */

const PAGE_LIMIT = 8

const router = useRouter()
const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'URL Shortener', ru: 'URL-сокращатель' }, locale.value),
  subtitle: tr(
    { en: 'Hot redirect path, Redis cache-aside, singleflight and bounded analytics.', ru: 'Горячий путь редиректа, Redis cache-aside, singleflight и ограниченная аналитика.' },
    locale.value,
  ),
  listTitle: tr({ en: 'Your links', ru: 'Ваши ссылки' }, locale.value),
  denied: tr({ en: 'Access denied', ru: 'Доступ запрещён' }, locale.value),
  loadError: tr({ en: 'Unable to load links', ru: 'Не удалось загрузить ссылки' }, locale.value),
  emptyTitle: tr({ en: 'No links in this scenario', ru: 'В этом сценарии нет ссылок' }, locale.value),
  emptyDesc: tr(
    { en: 'Create a short link above or switch the demo scenario.', ru: 'Создайте короткую ссылку выше или переключите демо-сценарий.' },
    locale.value,
  ),
  next: tr({ en: 'Next', ru: 'Далее' }, locale.value),
  previous: tr({ en: 'Previous', ru: 'Назад' }, locale.value),
  pagination: tr({ en: 'Links pagination', ru: 'Пагинация ссылок' }, locale.value),
}))

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
        <h2 class="shortener-overview__title">{{ labels.title }}</h2>
        <p class="shortener-overview__subtitle">{{ labels.subtitle }}</p>
      </div>
    </header>

    <ShortenerCreateForm @created="onCreated" />

    <div class="shortener-overview__list-head">
      <h3 class="shortener-overview__list-title">{{ labels.listTitle }}</h3>
    </div>

    <LoadingSkeleton v-if="query.isLoading.value" :rows="5" :columns="5" />

    <ErrorState
      v-else-if="query.isError.value"
      :title="isDenied ? labels.denied : labels.loadError"
      :message="listMessage"
      :on-retry="() => query.refetch()"
    />

    <EmptyState
      v-else-if="rows.length === 0"
      :title="labels.emptyTitle"
      :description="labels.emptyDesc"
    />

    <template v-else>
      <ShortenerList :links="rows" />

      <nav class="shortener-overview__pager" :aria-label="labels.pagination">
        <AppButton variant="secondary" size="sm" :disabled="cursorStack.length === 0" @click="previousPage">
          {{ labels.previous }}
        </AppButton>
        <AppButton variant="secondary" size="sm" :disabled="!hasNext" @click="nextPage">{{ labels.next }}</AppButton>
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
