import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  // Image optimization
  images: {
    domains: ['api.dev-quest.tech', 'www.dev-quest.tech'],
    formats: ['image/avif', 'image/webp'],
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Enable experimental features if needed
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Document-Policy',
            value: 'js-profiling',
          },
        ],
      },
    ];
  },

  // Rewrites to proxy API requests to the backend (avoids CORS)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG || 'momen-wl',
  project: process.env.SENTRY_PROJECT || 'javascript-react',
  silent: true,
  hideSourceMaps: true,
};

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;