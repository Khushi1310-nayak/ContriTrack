import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@heroicons/react", "recharts"],
    inlineCss: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: "contritrack-ev",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  
  // Updated configuration for the latest Sentry SDK
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: true,
  },
  
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
    reactComponentAnnotation: { enabled: true },
  },
});

