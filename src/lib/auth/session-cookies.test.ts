import { describe, expect, it, vi } from "vitest";
import {
  authSessionCookieNamesFromHeader,
  expireAuthCookies,
  isAuthSessionCookieName,
  originMatchesRequestHost,
} from "./session-cookies";

describe("isAuthSessionCookieName", () => {
  it("matches Neon / Better Auth session cookies", () => {
    expect(isAuthSessionCookieName("better-auth.session_token")).toBe(true);
    expect(
      isAuthSessionCookieName("__Secure-better-auth.session_token"),
    ).toBe(true);
    expect(isAuthSessionCookieName("neon-auth.session_token")).toBe(true);
    expect(isAuthSessionCookieName("better-auth.session_data")).toBe(true);
  });

  it("leaves app cookies alone", () => {
    expect(isAuthSessionCookieName("tg_list_edit")).toBe(false);
    expect(isAuthSessionCookieName("admin_sync_secret")).toBe(false);
  });
});

describe("authSessionCookieNamesFromHeader", () => {
  it("picks session cookies out of a Cookie header", () => {
    expect(
      authSessionCookieNamesFromHeader(
        "tg_list_edit=a.b; better-auth.session_token=abc; other=1",
      ),
    ).toEqual(["better-auth.session_token"]);
  });
});

describe("expireAuthCookies", () => {
  it("overwrites Auth cookies so the browser drops them", () => {
    const setCookie = vi.fn();
    expireAuthCookies(
      ["better-auth.session_token", "better-auth.session_data"],
      setCookie,
    );
    expect(setCookie).toHaveBeenCalledTimes(2);
    expect(setCookie.mock.calls[0]?.[0]).toBe("better-auth.session_token");
    expect(setCookie.mock.calls[0]?.[1]).toBe("");
    expect(setCookie.mock.calls[0]?.[2]).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
  });
});

describe("originMatchesRequestHost", () => {
  it("allows the public host even when the Worker URL differs", () => {
    expect(
      originMatchesRequestHost(
        new Request("https://thegamies-v2.example.workers.dev/api/account/delete", {
          headers: {
            origin: "https://thegamies.gg",
            host: "thegamies.gg",
          },
        }),
      ),
    ).toBe(true);
  });

  it("rejects a foreign origin", () => {
    expect(
      originMatchesRequestHost(
        new Request("https://thegamies.gg/api/account/delete", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toBe(false);
  });
});
