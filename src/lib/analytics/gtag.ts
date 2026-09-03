import {
  CONSENT_DENIED,
  COOKIE_CONSENT_STORAGE_KEY,
  consentUpdatePayload,
} from "./cookie-consent";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/** Time for Funding Choices to apply TCF before ads fire. */
export const ADS_CONSENT_WAIT_MS = 2000;

export function gtagConsentBootstrapScript(input?: {
  waitForUpdateMs?: number;
}): string {
  const wait = input?.waitForUpdateMs ?? 500;
  const denied = JSON.stringify(CONSENT_DENIED);
  const granted = JSON.stringify(consentUpdatePayload(true));
  const key = JSON.stringify(COOKIE_CONSENT_STORAGE_KEY);
  return [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag = gtag;",
    `gtag("consent","default",Object.assign(${denied},{wait_for_update:${wait}}));`,
    "try {",
    `  if (localStorage.getItem(${key}) === "accepted") {`,
    `    gtag("consent","update",${granted});`,
    "  }",
    "} catch (e) {}",
  ].join("");
}

export function gtagConfigScript(measurementId: string): string {
  const id = JSON.stringify(measurementId);
  return `gtag("js",new Date());gtag("config",${id},{anonymize_ip:true});`;
}

export function updateAnalyticsConsent(accepted: boolean): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", consentUpdatePayload(accepted));
}

export function trackPageView(measurementId: string, path: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("config", measurementId, { page_path: path, anonymize_ip: true });
}
