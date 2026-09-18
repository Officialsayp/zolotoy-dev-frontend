import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { viteSitePlugin } from './scripts/vite-site-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), viteSitePlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        demo: fileURLToPath(new URL('./demo/index.html', import.meta.url)),
      },
    },
  },
})
