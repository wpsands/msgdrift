import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Open Graph images read the display font from disk at request time.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/app/fonts/**/*"],
    "/r/[id]/opengraph-image": ["./src/app/fonts/**/*"],
  },
};

export default nextConfig;
