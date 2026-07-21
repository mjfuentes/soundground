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
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@/components', '@/lib', '@/contexts'],
    // Enable view transitions
    viewTransition: true,
  },
};

export default nextConfig;
