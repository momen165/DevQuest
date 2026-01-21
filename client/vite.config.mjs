import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
      app: path.resolve(__dirname, './src/app'),
      features: path.resolve(__dirname, './src/features'),
      shared: path.resolve(__dirname, './src/shared'),
      components: path.resolve(__dirname, './src/shared/ui'),
      pages: path.resolve(__dirname, './src/pages'),
      utils: path.resolve(__dirname, './src/shared/utils'),
      hooks: path.resolve(__dirname, './src/shared/hooks'),
      styles: path.resolve(__dirname, './src/shared/ui'),
      assets: path.resolve(__dirname, './src/assets'),
      AuthContext: path.resolve(__dirname, './src/app/AuthContext.jsx'),
      ProtectedRoute: path.resolve(__dirname, './src/app/ProtectedRoute.jsx'),
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
});
