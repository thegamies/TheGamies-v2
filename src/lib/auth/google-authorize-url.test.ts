import { describe, expect, it, vi } from "vitest";
import {
  googleAuthorizeUrlFromLocation,
  isSocialInitUrl,
  resolveSocialInitToGoogle,
} from "./google-authorize-url";

const AUTH_BASE =
  "https://ep-example.neonauth.c-4.us-east-2.aws.neon.tech/neondb/auth";

describe("isSocialInitUrl", () => {
  it("accepts this branch's social init URL", () => {
    expect(
      isSocialInitUrl(`${AUTH_BASE}/sign-in/social/init?token=abc`, AUTH_BASE),
    ).toBe(true);
  });

  it("rejects other hosts and paths", () => {
    expect(
      isSocialInitUrl("https://accounts.google.com/o/oauth2/v2/auth", AUTH_BASE),
    ).toBe(false);
    expect(
      isSocialInitUrl(`${AUTH_BASE}/sign-in/social/init`, AUTH_BASE),
    ).toBe(false);
    expect(
      isSocialInitUrl(
        "https://evil.example/neondb/auth/sign-in/social/init?token=abc",
        AUTH_BASE,
      ),
    ).toBe(false);
  });
});

describe("resolveSocialInitToGoogle", () => {
  it("adds the account chooser to Google's authorize URL", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, {
        status: 302,
        headers: {
          location:
            "https://accounts.google.com/o/oauth2/v2/auth?client_id=1&state=s",
        },
      });
    });
    await expect(
      resolveSocialInitToGoogle(
        `${AUTH_BASE}/sign-in/social/init?token=abc`,
        AUTH_BASE,
        fetchImpl,
      ),
    ).resolves.toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=1&state=s&prompt=select_account",
    );
  });

  it("does not follow a redirect that is not Google", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, {
        status: 302,
        headers: { location: "https://evil.example/phish" },
      });
    });
    await expect(
      resolveSocialInitToGoogle(
        `${AUTH_BASE}/sign-in/social/init?token=abc`,
        AUTH_BASE,
        fetchImpl,
      ),
    ).resolves.toBeNull();
  });
});

describe("googleAuthorizeUrlFromLocation", () => {
  it("keeps an existing consent prompt", () => {
    expect(
      googleAuthorizeUrlFromLocation(
        "https://accounts.google.com/o/oauth2/v2/auth?prompt=consent",
      ),
    ).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?prompt=consent+select_account",
    );
  });
});
