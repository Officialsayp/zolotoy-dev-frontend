import { ref } from 'vue'

/**
 * Idempotency-key lifecycle controller (MASTER_FRONTEND_PLAN §14.6, source §9).
 *
 * Create / Pay / Cancel are idempotent commands using `Idempotency-Key`. Rules:
 *  1. one key per logical user attempt, generated at the start of the attempt;
 *  2. preserve key + exact payload while the outcome is unknown;
 *  3. retrying an unknown timeout/network outcome reuses the SAME key + payload;
 *  4. a new logical attempt (or a changed payload) gets a NEW key;
 *  5. after a definitive response, the next attempt gets a new key.
 *
 * A changed payload with the same unresolved attempt therefore never silently
 * reuses an old key — it is treated as a new logical attempt.
 */

export function canonicalPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload)
  } catch {
    return String(payload)
  }
}

export function newIdempotencyKey(): string {
  // crypto.randomUUID is available in modern browsers and the jsdom test env.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useIdempotency() {
  const currentKey = ref<string | null>(null)
  const pinnedPayload = ref<string | null>(null)
  /** True once a definitive response arrived for the current attempt. */
  const resolved = ref(true)

  function begin(payload: unknown): string {
    const canonical = canonicalPayload(payload)
    if (!resolved.value && currentKey.value && pinnedPayload.value === canonical) {
      // Unresolved attempt with unchanged payload -> safe retry, reuse the key.
      return currentKey.value
    }
    // New logical attempt (fresh, or payload changed) -> new key, re-pin.
    currentKey.value = newIdempotencyKey()
    pinnedPayload.value = canonical
    resolved.value = false
    return currentKey.value
  }

  /** Call once a definitive response is known (success or final domain error). */
  function resolveOutcome(): void {
    resolved.value = true
    currentKey.value = null
    pinnedPayload.value = null
  }

  return { currentKey, pinnedPayload, resolved, begin, resolveOutcome }
}
