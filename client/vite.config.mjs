import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'momen-wl',
      project: 'javascript-react',
    }),
  ],

  build: {
    sourcemap: true,
  },

  server: {
    headers: {
      'Document-Policy': 'js-profiling',
    },
  },
});
