"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  adsenseAllowedOnPath,
  adsenseTestAds,
  getAdsenseBannerSlot,
  getAdsenseClientId,
} from "@/lib/ads/adsense";
import { queueAdsenseFill } from "@/lib/ads/queueAdsenseFill";

export function SiteAdBanner() {
  const pathname = usePathname();
  const client = getAdsenseClientId();
  const slot = getAdsenseBannerSlot();
  const testAds = adsenseTestAds();
  const insRef = useRef<HTMLModElement>(null);
  const show = Boolean(client && slot && adsenseAllowedOnPath(pathname));

  useEffect(() => {
    document.documentElement.classList.toggle("has-site-ad", show);
    return () => {
      document.documentElement.classList.remove("has-site-ad");
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const ins = insRef.current;
    if (!ins) return;
    queueAdsenseFill(ins);
  }, [show, client, slot]);

  if (!show) return null;

  return (
    <>
      {/* In-flow dock so the bar sits under the footer at the end of the page. */}
      <div className="h-[90px] shrink-0" aria-hidden />
      <aside
        className="fixed inset-x-0 bottom-0 z-20 h-[90px] border-t border-line/70 bg-paper/50 backdrop-blur-sm"
        aria-label="Advertisement"
      >
        <div className="mx-auto flex h-full w-full max-w-[var(--page-max)] items-center px-[var(--gutter)]">
          <ins
            ref={insRef}
            className="adsbygoogle block h-[90px] w-full"
            style={{ display: "block", height: "90px", width: "100%" }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
            {...(testAds ? { "data-adtest": "on" } : {})}
            // AdSense mutates this node (status, size) before/after hydrate.
            suppressHydrationWarning
          />
        </div>
      </aside>
    </>
  );
}
