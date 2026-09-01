import { describe, expect, it } from "vitest";
import {
  ADSENSE_BANNER_SLOT,
  ADSENSE_CLIENT_ID,
  adsTxtBody,
  adsensePublisherId,
  adsenseTestAds,
  getAdsenseBannerSlot,
  getAdsenseClientId,
  parseAdsenseClientId,
} from "./adsense";

describe("parseAdsenseClientId", () => {
  it("accepts a ca-pub id", () => {
    expect(parseAdsenseClientId(" ca-pub-9835884276920090 ")).toBe(
      "ca-pub-9835884276920090",
    );
  });

  it("rejects empty, off, and malformed ids", () => {
    expect(parseAdsenseClientId("")).toBeUndefined();
    expect(parseAdsenseClientId("off")).toBeUndefined();
    expect(parseAdsenseClientId("pub-9835884276920090")).toBeUndefined();
  });
});

describe("getAdsenseClientId", () => {
  it("uses the site publisher when the env is unset", () => {
    expect(getAdsenseClientId({})).toBe(ADSENSE_CLIENT_ID);
    expect(getAdsenseClientId({ NEXT_PUBLIC_ADSENSE_CLIENT: "  " })).toBe(
      ADSENSE_CLIENT_ID,
    );
  });

  it("can be turned off", () => {
    expect(
      getAdsenseClientId({ NEXT_PUBLIC_ADSENSE_CLIENT: "off" }),
    ).toBeUndefined();
  });
});

describe("getAdsenseBannerSlot", () => {
  it("uses the site unit when the env is unset", () => {
    expect(getAdsenseBannerSlot({})).toBe(ADSENSE_BANNER_SLOT);
    expect(getAdsenseBannerSlot({ NEXT_PUBLIC_ADSENSE_BANNER_SLOT: "  " })).toBe(
      ADSENSE_BANNER_SLOT,
    );
  });

  it("accepts a numeric display slot", () => {
    expect(
      getAdsenseBannerSlot({ NEXT_PUBLIC_ADSENSE_BANNER_SLOT: " 1234567890 " }),
    ).toBe("1234567890");
  });

  it("can be turned off", () => {
    expect(
      getAdsenseBannerSlot({ NEXT_PUBLIC_ADSENSE_BANNER_SLOT: "off" }),
    ).toBeUndefined();
  });

  it("rejects invalid ids", () => {
    expect(
      getAdsenseBannerSlot({ NEXT_PUBLIC_ADSENSE_BANNER_SLOT: "ca-pub-1" }),
    ).toBeUndefined();
  });
});

describe("adsenseTestAds", () => {
  it("is on in next dev and off in production", () => {
    expect(adsenseTestAds({ NODE_ENV: "development" })).toBe(true);
    expect(adsenseTestAds({ NODE_ENV: "production" })).toBe(false);
  });

  it("can be forced on or off", () => {
    expect(
      adsenseTestAds({ NODE_ENV: "production", NEXT_PUBLIC_ADSENSE_TEST: "on" }),
    ).toBe(true);
    expect(
      adsenseTestAds({
        NODE_ENV: "development",
        NEXT_PUBLIC_ADSENSE_TEST: "off",
      }),
    ).toBe(false);
  });

  it("without an override, follows this process NODE_ENV", () => {
    expect(adsenseTestAds()).toBe(process.env.NODE_ENV === "development");
  });
});

describe("adsTxtBody", () => {
  it("lists the Google AdSense seller line", () => {
    expect(adsensePublisherId(ADSENSE_CLIENT_ID)).toBe("pub-9835884276920090");
    expect(adsTxtBody()).toBe(
      "google.com, pub-9835884276920090, DIRECT, f08c47fec0942fa0\n",
    );
  });
});
