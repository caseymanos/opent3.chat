import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
