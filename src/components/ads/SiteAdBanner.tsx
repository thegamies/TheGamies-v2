"use client";

import { useEffect, useRef } from "react";
import {
  getAdsenseBannerSlot,
  getAdsenseClientId,
  adsenseTestAds,
} from "@/lib/ads/adsense";
import { queueAdsenseFill } from "@/lib/ads/queueAdsenseFill";

export function SiteAdBanner() {
  const client = getAdsenseClientId();
  const slot = getAdsenseBannerSlot();
  const testAds = adsenseTestAds();
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!client || !slot) return;
    const ins = insRef.current;
    if (!ins) return;
    queueAdsenseFill(ins);
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <>
      {/* In-flow dock so the bar sits under the footer at the end of the page. */}
      <div className="h-[90px] shrink-0" aria-hidden />
      <aside
        className="site-ad-bar fixed inset-x-0 bottom-0 z-20 h-[90px] max-h-[90px] overflow-hidden border-t border-line/70 bg-paper/50 backdrop-blur-sm"
        aria-label="Advertisement"
      >
        <div className="mx-auto flex h-full max-h-[90px] w-full max-w-[var(--page-max)] items-center overflow-hidden px-[var(--gutter)]">
          <ins
            ref={insRef}
            className="adsbygoogle block h-[90px] max-h-[90px] w-full overflow-hidden"
            style={{ display: "block", height: "90px", maxHeight: "90px", width: "100%" }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="horizontal"
            data-full-width-responsive="false"
            {...(testAds ? { "data-adtest": "on" } : {})}
            // AdSense mutates this node (status, size) before/after hydrate.
            suppressHydrationWarning
          />
        </div>
      </aside>
    </>
  );
}
