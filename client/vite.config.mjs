import { sentryVitePlugin } from '@sentry/vite-plugin'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'momen-wl',
      project: 'javascript-react',
    }),
  ],

  build: {
    outDir: 'dist', // 👈 ensure build output folder is correct
    sourcemap: false, // optional - keeps source hidden in prod
  },

  server: {
    headers: {
      'Document-Policy': 'js-profiling',
    },
  },

  base: '/', // 👈 ensures Vercel routes correctly
})
