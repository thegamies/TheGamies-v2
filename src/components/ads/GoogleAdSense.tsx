import Script from "next/script";
import { adsbygoogleScriptSrc, getAdsenseClientId } from "@/lib/ads/adsense";
import {
  fundingChoicesScriptSrc,
  googleFcPresentScript,
} from "@/lib/ads/funding-choices";

/**
 * AdSense + Funding Choices. `next/script` so React 19 does not treat a raw
 * `<script>` in this tree as a client-rendered tag (those never run).
 * `afterInteractive` still injects the real `adsbygoogle.js?client=` URL on
 * first paint and on client navigations onto publication routes.
 */
export function GoogleAdSense({ enabled = true }: { enabled?: boolean }) {
  const client = getAdsenseClientId();
  if (!enabled || !client) return null;

  return (
    <>
      <Script
        id="funding-choices"
        src={fundingChoicesScriptSrc(client)}
        strategy="afterInteractive"
        async
      />
      <Script id="googlefc-present" strategy="afterInteractive">
        {googleFcPresentScript()}
      </Script>
      <Script
        id="adsbygoogle"
        src={adsbygoogleScriptSrc(client)}
        strategy="afterInteractive"
        async
        crossOrigin="anonymous"
      />
    </>
  );
}
