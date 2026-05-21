import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "teamtrace-dev",
  project: "contritrack",
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

