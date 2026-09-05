import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { shortenerKeys } from './shortener-query-keys'

const queryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  createLink: vi.fn(),
  getLink: vi.fn(),
  listLinks: vi.fn(),
  deleteLink: vi.fn(),
  getLinkAnalytics: vi.fn(),
}))

vi.mock('@tanstack/vue-query', () => ({
  useQuery: queryMocks.useQuery,
  useMutation: queryMocks.useMutation,
  useQueryClient: queryMocks.useQueryClient,
}))

vi.mock('../api/shortener-api', () => ({ shortenerApi: {
  createLink: queryMocks.createLink,
  getLink: queryMocks.getLink,
  listLinks: queryMocks.listLinks,
  deleteLink: queryMocks.deleteLink,
  getLinkAnalytics: queryMocks.getLinkAnalytics,
} }))

import {
  useCreateShortLinkMutation,
  useDeleteShortLinkMutation,
  useShortLinkAnalyticsQuery,
  useShortLinkQuery,
  useShortLinksListQuery,
} from './use-shortener-queries'

/**
 * Shortener query composable wiring (Prompt 04 TESTS). Verifies service-prefixed
 * keys, that the LIST query never fetches per-row analytics (no N+1), and that
 * create/delete invalidate only the affected query families.
 */

const optionsByCall: unknown[] = []

beforeEach(() => {
  queryMocks.useQuery.mockReset()
  queryMocks.useMutation.mockReset()
  queryMocks.useQueryClient.mockReset()
  optionsByCall.length = 0
  queryMocks.useQuery.mockImplementation((options: unknown) => {
    optionsByCall.push(options)
    return {}
  })
})

describe('query keys', () => {
  it.each([
    ['list', () => useShortLinksListQuery(ref({ cursor: 'c1', limit: 5 })), shortenerKeys.list({ cursor: 'c1', limit: 5 })],
  ])('%s', (_name, setup, expected) => {
    setup()
    const options = optionsByCall[0] as { queryKey: { value: unknown } }
    expect(options.queryKey.value).toEqual(expected)
  })

  it('builds service-prefixed detail and analytics keys', () => {
    useShortLinkQuery(ref('link-1'))
    const detail = optionsByCall[0] as { queryKey: { value: unknown } }
    expect(detail.queryKey.value).toEqual(shortenerKeys.detail('link-1'))

    useShortLinkAnalyticsQuery(ref('link-1'))
    const analytics = optionsByCall[1] as { queryKey: { value: unknown } }
    expect(analytics.queryKey.value).toEqual(shortenerKeys.analytics('link-1'))
  })
})

describe('no analytics N+1 from the list', () => {
  it('the list query calls only listLinks, never per-row analytics', async () => {
    queryMocks.listLinks.mockResolvedValue({ items: [], has_more: false, next_cursor: null })
    queryMocks.getLinkAnalytics.mockResolvedValue({ total_clicks: 0, by_day: [], by_referrer: [], by_device: [] })

    useShortLinksListQuery(ref({ limit: 5 }))
    const options = optionsByCall[0] as unknown as { queryFn: () => Promise<unknown> }
    await options.queryFn()

    expect(queryMocks.listLinks).toHaveBeenCalledWith({ limit: 5 })
    expect(queryMocks.getLinkAnalytics).not.toHaveBeenCalled()
  })
})

describe('mutation invalidation', () => {
  it('create invalidates only the list family (never the whole cache)', () => {
    const invalidateQueries = vi.fn()
    queryMocks.useQueryClient.mockReturnValue({ invalidateQueries })

    let mutationOptions: { onSuccess: (d: unknown, v: unknown) => void } | undefined
    queryMocks.useMutation.mockImplementation((o: typeof mutationOptions) => {
      mutationOptions = o
      return { isPending: { value: false }, mutateAsync: vi.fn() }
    })

    useCreateShortLinkMutation()
    mutationOptions!.onSuccess?.({} as never, { url: 'https://x.dev/a' })

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: shortenerKeys.lists() })
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['shortener'] })
  })

  it('delete invalidates detail, analytics and lists for that link', () => {
    const invalidateQueries = vi.fn()
    queryMocks.useQueryClient.mockReturnValue({ invalidateQueries })

    let mutationOptions: { onSuccess: (d: unknown, v: string) => void } | undefined
    queryMocks.useMutation.mockImplementation((o: typeof mutationOptions) => {
      mutationOptions = o
      return { isPending: { value: false }, mutateAsync: vi.fn() }
    })

    useDeleteShortLinkMutation()
    mutationOptions!.onSuccess?.({} as never, 'link-9')

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: shortenerKeys.detail('link-9') })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: shortenerKeys.analytics('link-9') })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: shortenerKeys.lists() })
  })
})
