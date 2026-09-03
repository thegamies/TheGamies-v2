"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  adsenseAllowedOnPath,
  adsenseTestAds,
  getAdsenseBannerSlot,
  getAdsenseClientId,
} from "@/lib/ads/adsense";
import {
  adsenseInsIsFilled,
  queueAdsenseFill,
} from "@/lib/ads/queueAdsenseFill";

export function SiteAdBanner() {
  const pathname = usePathname();
  const client = getAdsenseClientId();
  const slot = getAdsenseBannerSlot();
  const testAds = adsenseTestAds();
  const insRef = useRef<HTMLModElement>(null);
  const show = Boolean(client && slot && adsenseAllowedOnPath(pathname));
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!show) return;
    const ins = insRef.current;
    if (!ins) return;
    queueAdsenseFill(ins);

    const syncFilled = () => setFilled(adsenseInsIsFilled(ins));
    syncFilled();
    const observer = new MutationObserver(syncFilled);
    observer.observe(ins, {
      attributes: true,
      attributeFilter: ["data-ad-status", "data-adsbygoogle-status"],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [show, client, slot]);

  useEffect(() => {
    const visible = show && filled;
    document.documentElement.classList.toggle("has-site-ad", visible);
    return () => {
      document.documentElement.classList.remove("has-site-ad");
    };
  }, [show, filled]);

  if (!show) return null;

  return (
    <>
      {/* In-flow dock so the bar sits under the footer at the end of the page. */}
      <div
        className={filled ? "h-[90px] shrink-0" : "h-0 shrink-0"}
        aria-hidden
      />
      <aside
        className={
          filled
            ? "site-ad-bar site-ad-bar--filled fixed inset-x-0 bottom-0 z-20 h-[90px] max-h-[90px] overflow-hidden border-t border-line/70 bg-paper/50 backdrop-blur-sm"
            : "site-ad-bar fixed inset-x-0 bottom-0 z-20 h-[90px] max-h-[90px] overflow-hidden border-0 bg-transparent opacity-0 pointer-events-none"
        }
        aria-hidden={filled ? undefined : true}
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
