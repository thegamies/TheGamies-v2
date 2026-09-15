import type { ReactNode } from "react";
import { GoogleAdSense } from "@/components/ads/GoogleAdSense";
import { SiteAdBanner } from "@/components/ads/SiteAdBanner";
import { adsenseAccountMetadata } from "@/lib/ads/adsense";

export const generateMetadata = adsenseAccountMetadata;

/** Server-rendered AdSense snippet + banner. Used on publication routes only. */
export function SiteAds({ forceBanner = false }: { forceBanner?: boolean }) {
  return (
    <>
      <GoogleAdSense />
      <SiteAdBanner force={forceBanner} />
    </>
  );
}

export default function AdsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteAds />
      {children}
    </>
  );
}
