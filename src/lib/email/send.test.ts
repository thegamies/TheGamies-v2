import { describe, expect, it } from "vitest";
import {
  buildAuthEmail,
  isSafeEmailHref,
  isUndeliverableEmailAddress,
} from "./send";

describe("isUndeliverableEmailAddress", () => {
  it("flags reserved example and test domains", () => {
    expect(isUndeliverableEmailAddress("qa@example.com")).toBe(true);
    expect(isUndeliverableEmailAddress("QA@Example.ORG")).toBe(true);
    expect(isUndeliverableEmailAddress("qa@mail.example")).toBe(true);
    expect(isUndeliverableEmailAddress("qa@thegamies.invalid")).toBe(true);
    expect(isUndeliverableEmailAddress("qa@box.test")).toBe(true);
  });

  it("leaves real domains alone", () => {
    expect(isUndeliverableEmailAddress("ada@gmail.com")).toBe(false);
    expect(isUndeliverableEmailAddress("ada@notexample.com")).toBe(false);
    expect(isUndeliverableEmailAddress("ada@testing.io")).toBe(false);
    expect(isUndeliverableEmailAddress(undefined)).toBe(false);
  });
});

describe("isSafeEmailHref", () => {
  it("allows https and loopback http", () => {
    expect(isSafeEmailHref("https://thegamies.gg/auth/confirmed?token=a")).toBe(true);
    expect(isSafeEmailHref("http://localhost:3000/auth/confirmed")).toBe(true);
    expect(isSafeEmailHref("http://127.0.0.1:3000/x")).toBe(true);
  });

  it("refuses other schemes and plain http hosts", () => {
    expect(isSafeEmailHref("http://thegamies.gg/x")).toBe(false);
    expect(isSafeEmailHref("http://localhost.evil.com/x")).toBe(false);
    expect(isSafeEmailHref("javascript:alert(1)")).toBe(false);
    expect(isSafeEmailHref("data:text/html,hi")).toBe(false);
    expect(isSafeEmailHref("/relative")).toBe(false);
  });
});

describe("buildAuthEmail link safety", () => {
  function magicLink(linkUrl: string) {
    return {
      event_type: "send.magic_link",
      user: { email: "ada@gmail.com" },
      event_data: { link_type: "magic-link", link_url: linkUrl },
    };
  }

  it("builds mail for an https link", () => {
    const message = buildAuthEmail(magicLink("https://auth.example/sign-in?token=a"));
    expect(message?.html).toContain("https://auth.example/sign-in?token=a");
  });

  it("builds nothing for an unsafe link", () => {
    expect(buildAuthEmail(magicLink("javascript:alert(1)"))).toBeNull();
    expect(buildAuthEmail(magicLink("http://evil.example/x"))).toBeNull();
  });
});
