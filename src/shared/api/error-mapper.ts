import { createAppError, type AppError, type AppErrorKind } from './api-error'

/**
 * Maps a parsed response body + HTTP status (or a thrown fetch error) into the
 * normalized `AppError`. The shared transport owns the transport-level mapping
 * only; service-specific interpretation of a backend `code` stays in modules.
 */

export interface ErrorEnvelope {
  code?: string
  message?: string
  details?: unknown
}

/** Recognize the `{error:{code,message,details}}` envelope fixed by the specs. */
interface ErrorEnvelopeResponse {
  error?: ErrorEnvelope
  code?: string
  message?: string
  detail?: unknown
}

export function parseErrorEnvelope(body: unknown): ErrorEnvelope | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const candidate = body as ErrorEnvelopeResponse
  if (candidate.error && typeof candidate.error === 'object') {
    return {
      code: candidate.error.code,
      message: candidate.error.message,
      details: candidate.error.details,
    }
  }
  return undefined
}

const KIND_FOR_STATUS: Record<number, AppErrorKind> = {
  400: 'validation',
  401: 'authentication',
  403: 'authorization',
  404: 'not-found',
  409: 'conflict',
  429: 'rate-limit',
}

const DEFAULT_MESSAGE_FOR_STATUS: Record<number, string> = {
  400: 'The request could not be processed.',
  401: 'Authentication is required. Please sign in.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'The request conflicts with the current state.',
  429: 'Too many requests. Please try again shortly.',
}

export function statusToKind(status: number): AppErrorKind {
  return KIND_FOR_STATUS[status] ?? (status >= 500 ? 'server' : 'unknown')
}

export function mapHttpError(status: number, body?: unknown, cause?: unknown): AppError {
  const kind = statusToKind(status)
  const envelope = parseErrorEnvelope(body)
  let message: string | undefined
  if (envelope && envelope.message) {
    message = envelope.message
  } else if (DEFAULT_MESSAGE_FOR_STATUS[status]) {
    message = DEFAULT_MESSAGE_FOR_STATUS[status]
  }
  // Domain/business 4xx that is not otherwise classified stays a safe "business"
  // error only when a backend code tells us it is a domain rule rejection.
  if (status >= 400 && status < 500 && kind === 'unknown' && (envelope?.code || envelope?.message)) {
    return createAppError({
      kind: 'business',
      status,
      code: envelope?.code,
      message,
      details: envelope?.details,
      cause,
    })
  }
  return createAppError({ kind, status, code: envelope?.code, message, details: envelope?.details, cause })
}

export function mapNetworkError(cause: unknown, isTimeout = false): AppError {
  if (isTimeout) {
    return createAppError({ kind: 'timeout', message: 'The request timed out.', cause })
  }
  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return createAppError({ kind: 'timeout', message: 'The request timed out.', cause })
  }
  return createAppError({ kind: 'network', message: 'Could not reach the service.', cause })
}

/** Crawl a response: parse text, attempt JSON, then map. Never throws. */
export async function errorFromResponse(response: Response): Promise<AppError> {
  let body: unknown
  try {
    const text = await response.text()
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }
  } catch {
    body = undefined
  }
  return mapHttpError(response.status, body, response)
}
