/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adsenseTestAds,
  getAdsenseBannerSlot,
  getAdsenseClientId,
} from "@/lib/ads/adsense";

vi.mock("@/lib/ads/adsense", () => ({
  getAdsenseClientId: vi.fn(() => "ca-pub-9835884276920090"),
  getAdsenseBannerSlot: vi.fn(() => "1234567890"),
  adsenseTestAds: vi.fn(() => false),
}));

import { SiteAdBanner } from "./SiteAdBanner";

afterEach(() => {
  cleanup();
  vi.mocked(getAdsenseClientId).mockReturnValue("ca-pub-9835884276920090");
  vi.mocked(getAdsenseBannerSlot).mockReturnValue("1234567890");
  vi.mocked(adsenseTestAds).mockReturnValue(false);
});

describe("SiteAdBanner", () => {
  it("renders a bottom advertisement unit and queues AdSense", () => {
    const push = vi.fn();
    Object.defineProperty(window, "adsbygoogle", {
      configurable: true,
      writable: true,
      value: { push },
    });

    render(<SiteAdBanner />);
    const region = screen.getByRole("complementary", { name: "Advertisement" });
    expect(region).toBeTruthy();
    const unit = region.querySelector("ins.adsbygoogle");
    expect(unit?.getAttribute("data-ad-client")).toBe(
      "ca-pub-9835884276920090",
    );
    expect(unit?.getAttribute("data-ad-slot")).toBe("1234567890");
    expect(unit?.getAttribute("data-ad-format")).toBe("horizontal");
    expect(unit?.getAttribute("data-full-width-responsive")).toBe("false");
    expect(region.className).toContain("fixed");
    expect(region.className).toContain("h-[90px]");
    expect(region.className).toContain("overflow-hidden");
    expect(region.className).toContain("bg-paper/50");
    expect(region.previousElementSibling?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(unit?.getAttribute("data-adtest")).toBeNull();
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("requests AdSense test ads when test mode is on", () => {
    vi.mocked(adsenseTestAds).mockReturnValue(true);
    Object.defineProperty(window, "adsbygoogle", {
      configurable: true,
      writable: true,
      value: { push: vi.fn() },
    });

    render(<SiteAdBanner />);
    const unit = document.querySelector("ins.adsbygoogle");
    expect(unit?.getAttribute("data-adtest")).toBe("on");
  });

  it("renders nothing when the slot is unset", () => {
    vi.mocked(getAdsenseBannerSlot).mockReturnValue(undefined);
    const push = vi.fn();
    Object.defineProperty(window, "adsbygoogle", {
      configurable: true,
      writable: true,
      value: { push },
    });

    const { container } = render(<SiteAdBanner />);
    expect(container.firstChild).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
