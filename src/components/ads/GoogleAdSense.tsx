import { getAdsenseClientId } from "@/lib/ads/adsense";
import {
  fundingChoicesScriptSrc,
  googleFcPresentScript,
} from "@/lib/ads/funding-choices";

/** AdSense’s snippet must be in `<head>` of the initial HTML (their crawler). */
export function GoogleAdSense({ enabled = true }: { enabled?: boolean }) {
  const client = getAdsenseClientId();
  if (!enabled || !client) return null;

  return (
    <>
      <script
        id="funding-choices"
        async
        src={fundingChoicesScriptSrc(client)}
        suppressHydrationWarning
      />
      <script
        id="googlefc-present"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: googleFcPresentScript() }}
      />
      <script
        id="adsbygoogle"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
        crossOrigin="anonymous"
        suppressHydrationWarning
      />
    </>
  );
}
