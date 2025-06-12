import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if your project has type errors.
    ignoreBuildErrors: false, // Keep TypeScript checking since we've fixed all TS errors
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Stable Turbopack configuration
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
    resolveAlias: {
      '@': './src',
    },
  },

  // Enhanced development experience (only for Webpack fallback)
  webpack: (config, { dev, isServer }) => {
    if (dev && !process.env.TURBOPACK) {
      // Better source maps for debugging (only when not using Turbopack)
      config.devtool = 'eval-source-map'
    }
    return config
  },
};

export default nextConfig;
