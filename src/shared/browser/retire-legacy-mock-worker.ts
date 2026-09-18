/**
 * One-time retirement of this application's legacy root-scoped MSW worker.
 *
 * The demo service worker moved from /mockServiceWorker.js (scope "/") to
 * /demo/mockServiceWorker.js (scope /demo/). Browsers keep an old active
 * registration until the document navigating away unregisters it, so demo and
 * demo-adjacent entries call this helper to remove only the known legacy
 * registration — identified by exact same-origin script URL — without touching
 * unrelated service workers or clearing storage/caches.
 *
 * No reload loop: callers invoke this once per entry load; a surviving
 * controller is harmless because document navigation replaces the client.
 */

export interface LegacyWorkerInfo {
  scriptURL: string
  scope: string
}

const LEGACY_SCRIPT_PATHS = ['/mockServiceWorker.js']

/** Find the known legacy root MSW registration, if present. */
export async function findLegacyMockWorker(): Promise<LegacyWorkerInfo | null> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return null
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL ?? registration.installing?.scriptURL
      if (!scriptURL) continue
      let path: string
      try {
        const url = new URL(scriptURL, location.origin)
        // Exact same-origin script URL only; never touch other origins/paths.
        if (url.origin !== location.origin) continue
        path = url.pathname
      } catch {
        continue
      }
      if (LEGACY_SCRIPT_PATHS.includes(path)) {
        return { scriptURL, scope: registration.scope }
      }
    }
  } catch {
    // Service worker API unavailable/blocked; nothing to retire.
  }
  return null
}

/**
 * Unregister only the legacy root-scoped mock worker. Returns true when a
 * registration was removed. Importers must NOT pull MSW into the public
 * bundle — this module only uses the standard serviceWorker API.
 */
export async function retireLegacyMockWorker(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return false
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    let removed = false
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL ?? registration.installing?.scriptURL
      if (!scriptURL) continue
      const url = new URL(scriptURL, location.origin)
      if (url.origin !== location.origin) continue
      if (LEGACY_SCRIPT_PATHS.includes(url.pathname)) {
        const ok = await registration.unregister()
        removed = removed || ok
      }
    }
    return removed
  } catch {
    return false
  }
}
