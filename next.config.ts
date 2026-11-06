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
};

export default nextConfig;
