/**
 * URL Shortener network DTOs (MASTER_FRONTEND_PLAN §18.4, `04_url_shortener.md`).
 *
 * Provenance is explicit per field:
 *  - `CreateShortLinkRequest` and the core of `ShortLinkDto` are **SOURCE CONTRACT**
 *    (create request `{url, custom_alias?, expires_at?}`; response
 *    `{id, code, short_url, url, expires_at, created_at}`).
 *  - The management status enum, `owner_id`, `version`, list envelope/query names
 *    and the whole analytics DTO are **TBD / PROPOSED** and must not be treated as
 *    backend truth until OpenAPI stabilizes.
 */

/** SOURCE CONTRACT create request — exactly url / custom_alias? / expires_at?. */
export interface CreateShortLinkRequest {
  url: string
  custom_alias?: string
  expires_at?: string
}

/**
 * SOURCE CONTRACT create response. `short_url` is mandatory here and must be
 * used verbatim; the frontend never reconstructs it from a hostname + code.
 */
export interface CreateShortLinkResponse {
  id: string
  code: string
  short_url: string
  url: string
  expires_at: string | null
  created_at: string
}

/**
 * Management/list link representation. The exact GET/list DTO is still TBD, so
 * `short_url` stays optional here even though it is mandatory in the create
 * response above.
 */
export interface ShortLinkDto {
  id: string
  code: string
  /** SOURCE CONTRACT on create/get; optional on list rows (list DTO is TBD). */
  short_url?: string
  url: string
  expires_at: string | null
  created_at: string
  updated_at?: string
  /** PROPOSED CONTRACT — management status enum is TBD. */
  status?: string
  version?: number
  owner_id?: string | null
}

/** PROPOSED CONTRACT — keyset query parameter names are TBD. */
export interface ShortLinkListQuery {
  cursor?: string
  limit?: number
}

/** PROPOSED CONTRACT — list envelope names are TBD. */
export interface ShortLinkListDto {
  items: ShortLinkDto[]
  has_more: boolean
  next_cursor: string | null
}

export interface ClicksByDay {
  date: string
  clicks: number
}

export interface ClicksByReferrer {
  referrer_domain: string
  clicks: number
}

export interface ClicksByDevice {
  device_type: string
  clicks: number
}

/** PROPOSED CONTRACT — exact analytics response shape is TBD. */
export interface ShortLinkAnalyticsDto {
  total_clicks: number
  by_day: ClicksByDay[]
  by_referrer: ClicksByReferrer[]
  by_device: ClicksByDevice[]
}
