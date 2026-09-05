import { getHttpClients } from '@/app/providers/http-clients-instance'
import type { HttpQueryValue } from '@/shared/api/http-client'

import type {
  CreateShortLinkRequest,
  CreateShortLinkResponse,
  ShortLinkAnalyticsDto,
  ShortLinkDto,
  ShortLinkListDto,
  ShortLinkListQuery,
} from '../models/shortener-dto'

/**
 * URL Shortener module API facade (MASTER_FRONTEND_PLAN §18.4, §9).
 *
 * The only module code that talks to the shared HTTP client for Shortener
 * endpoints. MOCK mode intercepts the exact requests produced here, so this
 * facade is identical in mock and live mode.
 *
 * List cursor/query parameter names are PROPOSED CONTRACT (TBD until OpenAPI);
 * they are serialized in ONE place here.
 */

function client() {
  return getHttpClients().service.shortener
}

export function encodeShortenerId(id: string): string {
  return encodeURIComponent(id)
}

/** PROPOSED CONTRACT — keyset query names live in exactly one place. */
export const SHORTENER_LIST_QUERY_MAPPING = {
  cursor: 'cursor',
  limit: 'limit',
} as const

export function serializeShortenerListQuery(
  query: ShortLinkListQuery,
): Record<string, HttpQueryValue> {
  const result: Record<string, HttpQueryValue> = {}
  if (query.cursor) result[SHORTENER_LIST_QUERY_MAPPING.cursor] = query.cursor
  if (query.limit !== undefined) result[SHORTENER_LIST_QUERY_MAPPING.limit] = query.limit
  return result
}

export const shortenerApi = {
  /**
   * Create a short link. The body is EXACTLY the source request
   * `{url, custom_alias?, expires_at?}` — no extra fields, and `short_url` from
   * the response is used as-is, never reconstructed.
   */
  async createLink(request: CreateShortLinkRequest): Promise<CreateShortLinkResponse> {
    const body: Record<string, string> = { url: request.url }
    if (request.custom_alias) body.custom_alias = request.custom_alias
    if (request.expires_at) body.expires_at = request.expires_at
    return client().request<CreateShortLinkResponse>({ path: '/links', method: 'POST', body })
  },

  /** Management metadata. */
  async getLink(linkId: string): Promise<ShortLinkDto> {
    return client().request<ShortLinkDto>({
      path: `/links/${encodeShortenerId(linkId)}`,
      method: 'GET',
    })
  },

  /** Keyset-paginated list of the owner's links (no analytics totals per row). */
  async listLinks(query: ShortLinkListQuery = {}): Promise<ShortLinkListDto> {
    return client().request<ShortLinkListDto>({
      path: '/links',
      method: 'GET',
      query: serializeShortenerListQuery(query),
    })
  },

  /** Logical delete. Response DTO/status is TBD — we just await success. */
  async deleteLink(linkId: string): Promise<unknown> {
    return client().request<unknown>({
      path: `/links/${encodeShortenerId(linkId)}`,
      method: 'DELETE',
    })
  },

  /** Aggregate click analytics. Response shape is PROPOSED/TBD. */
  async getLinkAnalytics(linkId: string): Promise<ShortLinkAnalyticsDto> {
    return client().request<ShortLinkAnalyticsDto>({
      path: `/links/${encodeShortenerId(linkId)}/analytics`,
      method: 'GET',
    })
  },
}
