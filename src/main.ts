import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from '@/app/app.vue'
import { router } from '@/app/router'
import { installAppGuards } from '@/app/router/guards'
import { createQueryClient, setAppQueryClient } from '@/app/providers/query-client'
import { useAppStore } from '@/app/stores/app-store'
import { useThemeStore } from '@/app/stores/theme-store'
import { useSessionStore } from '@/modules/auth/store/session-store'
import { loadAppConfig } from '@/shared/config/app-config'
import { getRuntimeEnv } from '@/shared/config/runtime-env'

import '@/shared/styles/tokens.css'
import '@/shared/styles/base.css'
import '@/shared/styles/utilities.css'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[ch] ?? ch
  })
}

/** Full-screen fatal state for bootstrap/config errors (display priority rule). */
function renderFatal(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  document.title = 'Configuration error · zolotoy.dev'
  const root = document.getElementById('app')
  if (!root) return
  root.innerHTML = `
    <div style="max-width:520px;margin:10vh auto;padding:24px;font-family:system-ui;color:#e45858;">
      <h1 style="font-size:20px;margin:0 0 8px;">Configuration error</h1>
      <p style="font-size:14px;color:#8a93a1;margin:0;">${escapeHtml(message)}</p>
      <p style="font-size:13px;color:#8a93a1;margin-top:16px;">
        Check your Vite environment variables against <code>env.example</code> and restart.
      </p>
    </div>`
}

async function bootstrap(): Promise<void> {
  let config
  try {
    config = loadAppConfig(getRuntimeEnv())
  } catch (error) {
    renderFatal(error)
    return
  }

  const app = createApp(App)
  const pinia = createPinia()
  const queryClient = createQueryClient()
  setAppQueryClient(queryClient)
  app.use(pinia)
  app.use(VueQueryPlugin, { queryClient })

  useAppStore(pinia).initialize(config.apiMode, config.deployEnv)
  useThemeStore(pinia).initialize()

  // Mock mode must intercept the network before auth bootstrap can issue the
  // cookie refresh request. Starting the router earlier would let its initial
  // guard trigger bootstrap before MSW is ready. Dynamic import keeps MSW and
  // the service mock handlers out of the production entry bundle.
  if (config.apiMode === 'mock') {
    const { startMockWorker } = await import('@/mocks/browser')
    await startMockWorker()
  }

  const session = useSessionStore(pinia)
  // Begin bootstrap once, after the network boundary is ready. The initial route
  // guard below waits for this same single-flight promise, so even public service
  // pages cannot start protected resource queries while auth is still unknown.
  void session.bootstrap()

  // Vue Router starts the initial navigation during `app.use(router)`, therefore
  // guards must already be registered at that point.
  installAppGuards(router)
  app.use(router)

  app.mount('#app')
}

void bootstrap()
