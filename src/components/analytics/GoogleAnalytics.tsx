import { Suspense } from "react";
import { getGaMeasurementId } from "@/lib/analytics/measurement";
import { gtagConfigScript } from "@/lib/analytics/gtag";
import { AnalyticsListener } from "./AnalyticsListener";

/**
 * GA4 snippet must be a real `<script>` in `<head>` (Google’s checker reads
 * HTML source, not afterInteractive).
 */
export function GoogleAnalytics() {
  const measurementId = getGaMeasurementId();
  if (!measurementId) return null;

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        suppressHydrationWarning
      />
      <script
        id="ga-config"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: gtagConfigScript(measurementId) }}
      />
    </>
  );
}

/** Client route changes after the first view (that view is sent from `<head>`). */
export function GoogleAnalyticsRouteTracker() {
  const measurementId = getGaMeasurementId();
  if (!measurementId) return null;

  return (
    <Suspense fallback={null}>
      <AnalyticsListener measurementId={measurementId} />
    </Suspense>
  );
}
