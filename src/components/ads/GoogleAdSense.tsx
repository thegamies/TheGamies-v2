import Script from "next/script";
import { getAdsenseClientId } from "@/lib/ads/adsense";

export function GoogleAdSense() {
  const client = getAdsenseClientId();
  if (!client) return null;

  return (
    <Script
      id="adsense"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
      async
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
