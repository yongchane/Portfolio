import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next tracing scoped to the project root.
  outputFileTracingRoot: process.cwd(),

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Build performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Experimental features for faster builds
  experimental: {
    optimizePackageImports: ['react-icons', 'framer-motion'],
    webpackBuildWorker: true,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
