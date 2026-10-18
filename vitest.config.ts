import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Vitest unit/component configuration.
// Matches the Vite aliases so `@` resolves identically across dev/test/build.
export default defineConfig({
  test: {
    globals: true,
    css: true,
    restoreMocks: true,
    projects: [
      {
        plugins: [vue()],
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
          },
        },
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./src/tests/setup.ts'],
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
          },
        },
        // Build-tooling tests (scripts/) run in plain node: no DOM, no browser
        // test setup — the tooling must not depend on either.
        test: {
          name: 'tools',
          environment: 'node',
          include: ['scripts/**/*.spec.ts'],
        },
      },
    ],
  },
})
