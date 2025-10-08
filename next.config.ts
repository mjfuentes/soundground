import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i1.sndcdn.com",
      },
      {
        protocol: "https",
        hostname: "**.sndcdn.com",
      },
    ],
  },
  // Improve Fast Refresh stability
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@/components', '@/lib', '@/contexts'],
    // Enable view transitions
    viewTransition: true,
  },
  // Reduce webpack errors during hot reload
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Ignore specific modules that cause issues during HMR
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

export default nextConfig;
