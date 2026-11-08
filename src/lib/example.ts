import type { DriftReport } from "@/lib/engine/schema";
import hubspotJson from "@/data/example-hubspot.json";
import databricksJson from "@/data/example-databricks.json";

/**
 * Example reports: real scans of public companies, read against a positioning
 * document assembled from the company's own public statements. The JSON files
 * are saved exactly as the scan produced them. Re-run them with the scan form
 * and the sources below when they go stale.
 */
export interface ExampleScan {
  slug: string;
  company: string;
  report: DriftReport;
  /** Two or three sentences on what the scan found, for the index and the landing page. */
  blurb: string;
  source: {
    /** Where the positioning document came from and why this company. */
    summary: string;
    links: { label: string; href: string }[];
  };
}

export const EXAMPLES: ExampleScan[] = [
  {
    slug: "hubspot",
    company: "HubSpot",
    report: hubspotJson as DriftReport,
    blurb:
      "HubSpot renamed INBOUND to UNBOUND in 2026 and now calls itself an agentic customer platform for marketing, sales, service, and operations. The homepage carries that position at 82. The Products, Marketing Hub, and Smart CRM pages score 50 to 55 because they still pitch inbound marketing campaigns, speak mainly to marketers, and place the platform layer after six hub sections.",
    source: {
      summary:
        "HubSpot repositioned in public in April 2026 and explained the change in its own announcement, so the stated position is dated and quotable. The positioning document for this scan was assembled from that announcement and the products overview page, read in November 2026. Six pages were chosen the way a visitor would find them: homepage, products, why HubSpot, one hub, the CRM, and customers.",
      links: [
        { label: "One letter, fifteen years of evolution: Meet UNBOUND (HubSpot, April 7, 2026)", href: "https://www.hubspot.com/company-news/meet-unbound" },
        { label: "HubSpot products overview", href: "https://www.hubspot.com/products" },
      ],
    },
  },
  {
    slug: "databricks",
    company: "Databricks",
    report: databricksJson as DriftReport,
    blurb:
      "Databricks calls itself the data and AI company and organized its June 2026 Summit keynote around a context, cost, control, and choice thesis. The About page carries that at 93. The Platform page is lowest at 66: its FAQ still defines the product in Spark-era data engineering terms and makes an \"only platform\" claim the public position does not support. The homepage still showed a registration banner for a Summit that had already happened.",
    source: {
      summary:
        "Databricks states its position plainly on its About page and restated it at Data + AI Summit 2026. The positioning document for this scan was assembled from the About page and reporting on the opening keynote, read in November 2026. Pages were chosen the same way as the HubSpot example: homepage, platform, why Databricks, one product area, pricing, and about.",
      links: [
        { label: "About Databricks", href: "https://www.databricks.com/company/about-us" },
        { label: "Data + AI Summit 2026 keynote coverage (Flexera)", href: "https://www.flexera.com/blog/perspectives/databricks-data-ai-summit-2026/" },
      ],
    },
  },
];

export function findExample(slug: string): ExampleScan | undefined {
  return EXAMPLES.find((e) => e.slug === slug);
}

/** The report shown on the landing page. */
export const EXAMPLE_REPORT: DriftReport = EXAMPLES[0].report;
