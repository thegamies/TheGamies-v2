/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/lib/analytics/cookie-consent";
import { CookieConsentBanner } from "./CookieConsentBanner";

describe("CookieConsentBanner", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("is a complementary region, not in document flow when live", () => {
    render(<CookieConsentBanner />);
    const region = screen.getByRole("region", { name: "Cookie consent" });
    expect(region.className).toContain("fixed");
    expect(
      screen.getByRole("link", { name: "Our Cookie Policy" }).getAttribute("href"),
    ).toBe("/privacy#cookies");
  });

  it("stores Accept and hides", () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe(
      "accepted",
    );
    expect(screen.queryByRole("region", { name: "Cookie consent" })).toBeNull();
  });

  it("stores Reject and hides", () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe(
      "rejected",
    );
    expect(screen.queryByRole("region", { name: "Cookie consent" })).toBeNull();
  });

  it("stays visible in the design-system preview", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    render(<CookieConsentBanner preview />);
    expect(screen.getByRole("region", { name: "Cookie consent" })).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Cookie consent" }).className,
    ).not.toContain("fixed");
  });
});
