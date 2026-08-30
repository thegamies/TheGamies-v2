import { Suspense } from "react";
import Script from "next/script";
import { getGaMeasurementId } from "@/lib/analytics/measurement";
import { gtagConfigScript, gtagConsentBootstrapScript } from "@/lib/analytics/gtag";
import { AnalyticsListener } from "./AnalyticsListener";

export function GoogleAnalytics() {
  const measurementId = getGaMeasurementId();
  if (!measurementId) return null;

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: gtagConsentBootstrapScript() }}
      />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="ga-config" strategy="afterInteractive">
        {gtagConfigScript(measurementId)}
      </Script>
      <Suspense fallback={null}>
        <AnalyticsListener measurementId={measurementId} />
      </Suspense>
    </>
  );
}
