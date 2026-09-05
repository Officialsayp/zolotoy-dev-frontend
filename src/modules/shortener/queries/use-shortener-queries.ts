import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { shortenerApi } from '../api/shortener-api'
import type { CreateShortLinkRequest, ShortLinkListQuery } from '../models/shortener-dto'
import { shortenerKeys } from './shortener-query-keys'

/**
 * Keyset-paginated link list. Reactive input keeps the query key/request in sync
 * with cursor changes. List rows never trigger per-row analytics fetches.
 */
export function useShortLinksListQuery(query: MaybeRefOrGetter<ShortLinkListQuery>) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() => shortenerKeys.list(resolved.value)),
    queryFn: () => shortenerApi.listLinks(resolved.value),
  })
}

/** Link metadata. Route `linkId` is reactive. */
export function useShortLinkQuery(linkId: MaybeRefOrGetter<string>) {
  const resolvedId = computed(() => toValue(linkId))
  return useQuery({
    queryKey: computed(() => shortenerKeys.detail(resolvedId.value)),
    queryFn: () => shortenerApi.getLink(resolvedId.value),
    enabled: computed(() => Boolean(resolvedId.value)),
  })
}

/** Aggregate analytics for one link. Disabled until a real id is known. */
export function useShortLinkAnalyticsQuery(linkId: MaybeRefOrGetter<string>) {
  const resolvedId = computed(() => toValue(linkId))
  return useQuery({
    queryKey: computed(() => shortenerKeys.analytics(resolvedId.value)),
    queryFn: () => shortenerApi.getLinkAnalytics(resolvedId.value),
    enabled: computed(() => Boolean(resolvedId.value)),
  })
}

/** Create a link. On success invalidate ONLY the list family so the new row
 * appears; the caller may navigate to the detail using the returned DTO. */
export function useCreateShortLinkMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateShortLinkRequest) => shortenerApi.createLink(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shortenerKeys.lists() })
    },
  })
}

/**
 * Logical delete. On success invalidate this detail, the lists, and this link's
 * analytics (availability can change). Never a whole-cache clear.
 */
export function useDeleteShortLinkMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => shortenerApi.deleteLink(linkId),
    onSuccess: (_data, linkId) => {
      void queryClient.invalidateQueries({ queryKey: shortenerKeys.detail(linkId) })
      void queryClient.invalidateQueries({ queryKey: shortenerKeys.analytics(linkId) })
      void queryClient.invalidateQueries({ queryKey: shortenerKeys.lists() })
    },
  })
}
