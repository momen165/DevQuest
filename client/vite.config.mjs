import { sentryVitePlugin } from '@sentry/vite-plugin'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'momen-wl',
      project: 'javascript-react',
    }),
  ],

  resolve: {
    alias: {
      components: path.resolve(__dirname, './src/components'),
      pages: path.resolve(__dirname, './src/pages'),
      utils: path.resolve(__dirname, './src/utils'),
      hooks: path.resolve(__dirname, './src/hooks'),
      styles: path.resolve(__dirname, './src/styles'),
      assets: path.resolve(__dirname, './src/assets'),
      AuthContext: path.resolve(__dirname, './src/AuthContext.jsx'),
      ProtectedRoute: path.resolve(__dirname, './src/ProtectedRoute.jsx'),
    },
  },

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
