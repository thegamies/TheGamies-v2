import { describe, expect, it } from "vitest";
import {
  consentUpdatePayload,
  parseCookieConsent,
} from "./cookie-consent";

describe("parseCookieConsent", () => {
  it("accepts stored choices", () => {
    expect(parseCookieConsent("accepted")).toBe("accepted");
    expect(parseCookieConsent("rejected")).toBe("rejected");
  });

  it("treats anything else as no choice", () => {
    expect(parseCookieConsent(null)).toBeNull();
    expect(parseCookieConsent(undefined)).toBeNull();
    expect(parseCookieConsent("")).toBeNull();
    expect(parseCookieConsent("granted")).toBeNull();
  });
});

describe("consentUpdatePayload", () => {
  it("grants analytics and ads storage when accepted", () => {
    expect(consentUpdatePayload(true)).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_personalization: "granted",
      ad_user_data: "granted",
    });
  });

  it("denies analytics and ads storage when rejected", () => {
    expect(consentUpdatePayload(false)).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_personalization: "denied",
      ad_user_data: "denied",
    });
  });
});
