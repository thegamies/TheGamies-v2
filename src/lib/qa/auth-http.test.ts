import { describe, expect, it } from "vitest";
import { mergeAuthCookies } from "./auth-http";

describe("mergeAuthCookies", () => {
  it("applies Set-Cookie from getSetCookie onto an empty jar", () => {
    const res = new Response(null, {
      headers: {
        "set-cookie":
          "__Secure-better-auth.session_token=tok; Path=/; HttpOnly",
      },
    });
    expect(mergeAuthCookies("", res)).toContain(
      "__Secure-better-auth.session_token=tok",
    );
  });

  it("replaces an existing session cookie", () => {
    const res = {
      headers: {
        getSetCookie: () => [
          "__Secure-better-auth.session_token=fresh; Path=/; Max-Age=300",
        ],
        get: () => null,
      },
    } as unknown as Response;
    expect(
      mergeAuthCookies("__Secure-better-auth.session_token=stale", res),
    ).toBe("__Secure-better-auth.session_token=fresh");
  });
});
