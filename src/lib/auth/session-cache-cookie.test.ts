import { describe, expect, it } from "vitest";
import {
  SESSION_TOKEN_COOKIE_NAME,
  hasSessionTokenCookie,
  readCookie,
} from "./session-cache-cookie";

describe("hasSessionTokenCookie", () => {
  it("detects Better Auth session cookies", () => {
    expect(
      hasSessionTokenCookie("__Secure-better-auth.session_token=tok"),
    ).toBe(true);
    expect(hasSessionTokenCookie("better-auth.session_token=tok")).toBe(true);
    expect(hasSessionTokenCookie(`${SESSION_TOKEN_COOKIE_NAME}=tok`)).toBe(
      true,
    );
    expect(hasSessionTokenCookie("other=1")).toBe(false);
    expect(
      hasSessionTokenCookie("__Secure-better-auth.session_token="),
    ).toBe(false);
    expect(
      hasSessionTokenCookie("__Secure-neon-auth.session_token=legacy"),
    ).toBe(false);
  });
});

describe("readCookie", () => {
  it("reads a named cookie value", () => {
    expect(
      readCookie("a=1; better-auth.session_token=tok", "better-auth.session_token"),
    ).toBe("tok");
    expect(readCookie(null, "x")).toBeNull();
  });
});
