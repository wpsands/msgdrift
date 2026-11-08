import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: report pages are fully dynamic and must
  // return a real 404 for a missing id, which a prerendered shell cannot do.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Open Graph images read the display fonts from disk at request time.
  // Keys are globs, and "[id]" would be read as a character class, so match every route.
  outputFileTracingIncludes: {
    "/**": ["./src/app/fonts/**/*"],
  },
  // PostHog is served through /ingest on our own origin so the analytics
  // request is a first-party call. Order matters: assets before the catch-all.
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
