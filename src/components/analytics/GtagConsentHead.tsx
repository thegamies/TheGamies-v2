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

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: gtagConsentBootstrapScript({
          waitForUpdateMs: ads ? ADS_CONSENT_WAIT_MS : 500,
        }),
      }}
    />
  );
}
