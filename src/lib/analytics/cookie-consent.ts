export const COOKIE_CONSENT_STORAGE_KEY = "thegamies_cookie_consent";

export type CookieConsent = "accepted" | "rejected";

export const CONSENT_DENIED = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_personalization: "denied",
  ad_user_data: "denied",
} as const;

export function parseCookieConsent(value: string | null | undefined): CookieConsent | null {
  if (value === "accepted" || value === "rejected") return value;
  return null;
}

export function consentUpdatePayload(accepted: boolean) {
  return {
    analytics_storage: accepted ? "granted" : "denied",
    ad_storage: accepted ? "granted" : "denied",
    ad_personalization: accepted ? "granted" : "denied",
    ad_user_data: accepted ? "granted" : "denied",
  } as const;
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function setCookieConsent(consent: CookieConsent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Private mode / quota — banner may reappear.
  }
}
