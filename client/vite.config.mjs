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
    outDir: 'dist', //  ensure build output folder is correct
    sourcemap: false, // optional - keeps source hidden in prod
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('ckeditor5') || id.includes('@ckeditor')) return 'vendor-ckeditor';
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) return 'vendor-monaco';
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-charts';
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (id.includes('react-router') || id.includes('@remix-run')) return 'vendor-router';
          if (id.includes('react-hot-toast')) return 'vendor-toast';
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
          if (id.includes('react-icons') || id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('highlight.js')) return 'vendor-highlight';
          if (id.includes('html-react-parser') || id.includes('/entities/')) return 'vendor-html';
          if (id.includes('@hello-pangea/dnd')) return 'vendor-dnd';
          if (id.includes('gsap')) return 'vendor-gsap';
          if (id.includes('axios')) return 'vendor-axios';
        },
      },
    },
  },

  server: {
    headers: {
      'Document-Policy': 'js-profiling',
    },
  },

  base: '/', // ensures Vercel routes correctly
});
