import { describe, expect, it } from "vitest";
import { ADSENSE_CLIENT_ID } from "@/lib/ads/adsense";
import { generateMetadata } from "./AdsLayout";

describe("AdsLayout metadata", () => {
  it("sets the AdSense publisher account on publication routes", () => {
    expect(generateMetadata()).toEqual({
      other: { "google-adsense-account": ADSENSE_CLIENT_ID },
    });
  });
});
