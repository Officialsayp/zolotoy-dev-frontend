import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/vue-query'

import { notificationApi } from '../api/notification-api'
import { notificationPollInterval, parseNotificationStatus } from '../models/notification-domain'
import type { NotificationJobDetailDto, NotificationListQuery } from '../models/notification-dto'
import { notificationKeys } from './notification-query-keys'

/**
 * Keyset-paginated, filterable notifications list. The reactive input keeps the
 * query key/request in sync with filter/cursor changes without recreating pages.
 */
export function useNotificationsListQuery(query: MaybeRefOrGetter<NotificationListQuery>) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() => notificationKeys.list(resolved.value)),
    queryFn: () => notificationApi.listNotifications(resolved.value),
  })
}

/**
 * Job detail + attempts. Polls while the job is `pending`/`processing`/
 * `retry_wait` and stops at terminal statuses via the centralized
 * `notificationPollInterval` policy. Polling reacts to the job's own live data.
 */
export function useNotificationDetailQuery(notificationId: MaybeRefOrGetter<string>) {
  const resolvedId = computed(() => toValue(notificationId))

  return useQuery<NotificationJobDetailDto>({
    queryKey: computed(() => notificationKeys.detail(resolvedId.value)),
    queryFn: () => notificationApi.getNotification(resolvedId.value),
    enabled: computed(() => Boolean(resolvedId.value)),
    // While still loading, treat as active ('processing') so polling continues;
    // once a terminal status arrives the computed interval becomes `undefined`.
    refetchInterval: (query: Query<NotificationJobDetailDto>) => {
      return notificationPollInterval(
        parseNotificationStatus(query.state.data?.job.status) ?? 'processing',
      )
    },
  })
}

/** Event origin view (metadata + dedup + related jobs). No polling. */
export function useNotificationEventQuery(eventId: MaybeRefOrGetter<string>) {
  const resolvedId = computed(() => toValue(eventId))
  return useQuery({
    queryKey: computed(() => notificationKeys.event(resolvedId.value)),
    queryFn: () => notificationApi.getEvent(resolvedId.value),
    enabled: computed(() => Boolean(resolvedId.value)),
  })
}

/**
 * Manual retry mutation. On success invalidate ONLY the affected query families
 * (this detail, its event, and the list) so the UI shows the new server state
 * without inventing a local terminal status.
 */
export function useRetryNotificationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationApi.retryNotification(notificationId),
    onSuccess: (_data, notificationId) => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.detail(notificationId) })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.events() })
    },
  })
}
