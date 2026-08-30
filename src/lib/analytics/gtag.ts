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

export function gtagConsentBootstrapScript(): string {
  const denied = JSON.stringify(CONSENT_DENIED);
  const granted = JSON.stringify(consentUpdatePayload(true));
  const key = JSON.stringify(COOKIE_CONSENT_STORAGE_KEY);
  return [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag = gtag;",
    `gtag("consent","default",Object.assign(${denied},{wait_for_update:500}));`,
    "try {",
    `  if (localStorage.getItem(${key}) === "accepted") {`,
    `    gtag("consent","update",${granted});`,
    "  }",
    "} catch (e) {}",
  ].join("");
}

export function gtagConfigScript(measurementId: string): string {
  const id = JSON.stringify(measurementId);
  return `gtag("js",new Date());gtag("config",${id},{anonymize_ip:true,send_page_view:false});`;
}

export function updateAnalyticsConsent(accepted: boolean): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", consentUpdatePayload(accepted));
}

export function trackPageView(measurementId: string, path: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("config", measurementId, { page_path: path, anonymize_ip: true });
}
