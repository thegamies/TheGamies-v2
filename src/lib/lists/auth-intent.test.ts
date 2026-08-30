import { describe, expect, it } from "vitest";
import {
  buildListSignInHref,
  parseListAuthIntent,
  shareLinkPublishError,
  withListAuthIntent,
  withoutListAuthIntent,
} from "./auth-intent";

describe("parseListAuthIntent", () => {
  it("accepts save and share", () => {
    expect(parseListAuthIntent("save")).toBe("save");
    expect(parseListAuthIntent("share")).toBe("share");
  });

  it("rejects other values", () => {
    expect(parseListAuthIntent("claim")).toBeNull();
    expect(parseListAuthIntent(null)).toBeNull();
  });
});

describe("withListAuthIntent", () => {
  it("adds intent to a bare path", () => {
    expect(withListAuthIntent("/create/goty", "save")).toBe(
      "/create/goty?intent=save",
    );
  });

  it("preserves existing query and sets intent", () => {
    expect(withListAuthIntent("/create/goty?year=2026", "share")).toBe(
      "/create/goty?year=2026&intent=share",
    );
  });
});

describe("withoutListAuthIntent", () => {
  it("removes intent and keeps other params", () => {
    expect(withoutListAuthIntent("/create/goty?year=2026&intent=save")).toBe(
      "/create/goty?year=2026",
    );
  });
});

describe("buildListSignInHref", () => {
  it("encodes next with intent", () => {
    const href = buildListSignInHref("/create/goty?year=2026", "save");
    expect(href).toContain("/auth/sign-in?");
    expect(href).toContain("intent=save");
    expect(href).toContain(encodeURIComponent("/create/goty?year=2026&intent=save"));
  });
});

describe("shareLinkPublishError", () => {
  it("blocks anonymous publish", () => {
    expect(shareLinkPublishError(null)).toMatch(/Sign in/);
    expect(shareLinkPublishError(undefined)).toMatch(/Sign in/);
    expect(shareLinkPublishError("")).toMatch(/Sign in/);
  });

  it("allows owned publish", () => {
    expect(shareLinkPublishError("profile-1")).toBeNull();
  });
});
