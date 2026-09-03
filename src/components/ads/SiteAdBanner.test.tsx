/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adsenseAllowedOnPath,
  adsenseTestAds,
  getAdsenseBannerSlot,
  getAdsenseClientId,
} from "@/lib/ads/adsense";

vi.mock("next/navigation", () => ({
  usePathname: () => "/games/mass-effect",
}));

vi.mock("@/lib/ads/adsense", () => ({
  getAdsenseClientId: vi.fn(() => "ca-pub-9835884276920090"),
  getAdsenseBannerSlot: vi.fn(() => "1234567890"),
  adsenseTestAds: vi.fn(() => false),
  adsenseAllowedOnPath: vi.fn((path: string | null | undefined) => {
    const value = path ?? "/";
    return !value.startsWith("/auth") && !value.startsWith("/account");
  }),
}));

import { SiteAdBanner } from "./SiteAdBanner";

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("has-site-ad");
  vi.mocked(getAdsenseClientId).mockReturnValue("ca-pub-9835884276920090");
  vi.mocked(getAdsenseBannerSlot).mockReturnValue("1234567890");
  vi.mocked(adsenseTestAds).mockReturnValue(false);
  vi.mocked(adsenseAllowedOnPath).mockImplementation(
    (path: string | null | undefined) => {
      const value = path ?? "/";
      return !value.startsWith("/auth") && !value.startsWith("/account");
    },
  );
});

function mockAdsbygoogle() {
  const push = vi.fn();
  Object.defineProperty(window, "adsbygoogle", {
    configurable: true,
    writable: true,
    value: { push },
  });
  return push;
}

describe("SiteAdBanner", () => {
  it("queues AdSense but hides the bar until a creative fills", () => {
    const push = mockAdsbygoogle();

    render(<SiteAdBanner />);
    const region = document.querySelector(".site-ad-bar");
    if (!(region instanceof HTMLElement)) throw new Error("missing ad bar");
    expect(region?.getAttribute("aria-hidden")).toBe("true");
    expect(region?.className).toContain("opacity-0");
    expect(region?.className).not.toContain("backdrop-blur-sm");
    expect(region?.className).not.toContain("bg-paper/50");
    expect(document.documentElement.classList.contains("has-site-ad")).toBe(
      false,
    );
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
    expect(region.previousElementSibling?.className).toContain("h-0");
    expect(unit?.getAttribute("data-adtest")).toBeNull();
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("shows the bar and reserves space after AdSense fills", async () => {
    mockAdsbygoogle();
    render(<SiteAdBanner />);
    const unit = document.querySelector("ins.adsbygoogle");
    expect(unit).toBeTruthy();
    unit?.setAttribute("data-ad-status", "filled");

    await waitFor(() => {
      const region = screen.getByRole("complementary", {
        name: "Advertisement",
      });
      expect(region.className).toContain("site-ad-bar--filled");
      expect(region.className).toContain("backdrop-blur-sm");
      expect(region.className).not.toContain("opacity-0");
      expect(region.previousElementSibling?.className).toContain("h-[90px]");
      expect(document.documentElement.classList.contains("has-site-ad")).toBe(
        true,
      );
    });
  });

  it("stays hidden when AdSense reports an unfilled slot", async () => {
    mockAdsbygoogle();
    render(<SiteAdBanner />);
    document
      .querySelector("ins.adsbygoogle")
      ?.setAttribute("data-ad-status", "unfilled");

    await waitFor(() => {
      const region = document.querySelector(".site-ad-bar");
      expect(region?.className).toContain("opacity-0");
      expect(region?.className).not.toContain("backdrop-blur-sm");
      expect(region?.getAttribute("aria-hidden")).toBe("true");
      expect(document.documentElement.classList.contains("has-site-ad")).toBe(
        false,
      );
    });
  });

  it("requests AdSense test ads when test mode is on", () => {
    vi.mocked(adsenseTestAds).mockReturnValue(true);
    mockAdsbygoogle();

    render(<SiteAdBanner />);
    const unit = document.querySelector("ins.adsbygoogle");
    expect(unit?.getAttribute("data-adtest")).toBe("on");
  });

  it("renders nothing when the slot is unset", () => {
    vi.mocked(getAdsenseBannerSlot).mockReturnValue(undefined);
    const push = mockAdsbygoogle();

    const { container } = render(<SiteAdBanner />);
    expect(container.firstChild).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("renders nothing on auth pages", () => {
    vi.mocked(adsenseAllowedOnPath).mockReturnValue(false);
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
