import { describe, expect, it } from "vitest";
import {
  clientIpFromHeaders,
  isNeonAuthUrl,
  shareInflight,
  withClientIpHeader,
} from "@/lib/auth/auth-client-ip";

const authBase = "https://ep-example.neonauth.us-east-2.aws.neon.tech/dbname/auth";

describe("client IP for Auth rate limits", () => {
  it("uses the Cloudflare visitor address", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.8",
      "x-forwarded-for": "198.51.100.1",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.8");
  });

  it("rejects a missing or unusable address", () => {
    expect(clientIpFromHeaders(new Headers())).toBeNull();
    expect(
      clientIpFromHeaders(new Headers({ "cf-connecting-ip": "203.0.113.8, 1.2.3.4" })),
    ).toBeNull();
    expect(
      clientIpFromHeaders(new Headers({ "cf-connecting-ip": "203.0.113.999" })),
    ).toBeNull();
  });

  it("matches only the Auth host", () => {
    expect(isNeonAuthUrl(`${authBase}/get-session`, authBase)).toBe(true);
    expect(isNeonAuthUrl("https://thegamies.gg/api/auth/get-session", authBase)).toBe(
      false,
    );
  });

  it("sets x-forwarded-for on Auth fetches only", () => {
    const forwarded = withClientIpHeader(
      `${authBase}/get-session`,
      { headers: { cookie: "a=1" } },
      "203.0.113.8",
      authBase,
    );
    expect(new Headers(forwarded?.init?.headers).get("x-forwarded-for")).toBe(
      "203.0.113.8",
    );
    expect(new Headers(forwarded?.init?.headers).get("cookie")).toBe("a=1");
    expect(
      withClientIpHeader("https://thegamies.gg/games", undefined, "203.0.113.8", authBase),
    ).toBeNull();
  });
});

describe("shareInflight", () => {
  it("runs one call for concurrent readers of the same key", async () => {
    const inflight = new Map<string, Promise<number>>();
    let calls = 0;
    const run = () => {
      calls += 1;
      return Promise.resolve(calls);
    };
    const [a, b] = await Promise.all([
      shareInflight(inflight, "token", run),
      shareInflight(inflight, "token", run),
    ]);
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(calls).toBe(1);
    expect(inflight.size).toBe(0);
  });
});
