import type { MetadataRoute } from "next";
import { EXAMPLES } from "@/lib/example";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/scan`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/example`, changeFrequency: "monthly", priority: 0.7 },
    ...EXAMPLES.map((e) => ({ url: `${base}/example/${e.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${base}/method`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
