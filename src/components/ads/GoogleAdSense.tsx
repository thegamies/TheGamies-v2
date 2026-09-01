import { getAdsenseClientId } from "@/lib/ads/adsense";

/** AdSense’s snippet must be in `<head>` of the initial HTML (their crawler). */
export function GoogleAdSense() {
  const client = getAdsenseClientId();
  if (!client) return null;

  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
      crossOrigin="anonymous"
    />
  );
}
