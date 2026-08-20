import { describe, expect, it } from "vitest";
import { getGaMeasurementId } from "./measurement";
import { gtagConfigScript, gtagConsentBootstrapScript } from "./gtag";

describe("getGaMeasurementId", () => {
  it("returns a trimmed id", () => {
    expect(getGaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: " G-ABC " })).toBe(
      "G-ABC",
    );
  });

  it("is empty when unset", () => {
    expect(getGaMeasurementId({})).toBeUndefined();
    expect(getGaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "  " })).toBeUndefined();
  });
});

describe("gtag bootstrap", () => {
  it("defaults consent to denied and grants from stored Accept", () => {
    const script = gtagConsentBootstrapScript();
    expect(script).toContain("analytics_storage");
    expect(script).toContain("denied");
    expect(script).toContain("thegamies_cookie_consent");
    expect(script).toContain("accepted");
  });

  it("configures without an automatic first page view", () => {
    expect(gtagConfigScript("G-TEST")).toContain("send_page_view:false");
    expect(gtagConfigScript("G-TEST")).toContain("G-TEST");
  });
});
