"use client";

import { track } from "@/lib/analytics";

export const GAP_MAP_URL =
  "https://sandsdx.com/engagements/?utm_source=msgdrift&utm_medium=referral&utm_campaign=results#gap-map";

/** Closing call to action on a drift report. Links to the SandsDX Gap Map. */
export function GapMapCta({ example }: { example: boolean }) {
  return (
    <section className="rule-strong mt-20 pt-8 grid-12 gap-y-6">
      <h2 className="label col-span-12 md:col-span-3">Found drift?</h2>
      <div className="col-span-12 md:col-span-8">
        <p className="text-xl leading-relaxed">
          The SandsDX Gap Map finds every place the old story still runs across your message, targeting, sales motion, and
          measurement, then plans the fix with your team.
        </p>
        <a
          href={GAP_MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn mt-6"
          onClick={() => track("gap_map_clicked", { example })}
        >
          See the Gap Map
        </a>
      </div>
    </section>
  );
}
