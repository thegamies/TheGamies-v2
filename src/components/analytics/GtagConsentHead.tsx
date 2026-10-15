import { getAdsenseClientId } from "@/lib/ads/adsense";
import {
  ADS_CONSENT_WAIT_MS,
  gtagConsentBootstrapScript,
} from "@/lib/analytics/gtag";
import { getGaMeasurementId } from "@/lib/analytics/measurement";

/** Consent Mode defaults in `<head>` before AdSense / Funding Choices / GA. */
export function GtagConsentHead() {
  const ads = Boolean(getAdsenseClientId());
  const ga = Boolean(getGaMeasurementId());
  if (!ads && !ga) return null;
  // The tag is in the server HTML. A client render of <script> is a console
  // error and never runs, which covers the page after sign-out.
  if (typeof window !== "undefined") return null;

  return (
    <script
      id="gtag-consent-default"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: gtagConsentBootstrapScript({
          waitForUpdateMs: ads ? ADS_CONSENT_WAIT_MS : 500,
        }),
      }}
    />
  );
}
