import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_CLIENT_IP_FETCH,
  clientIpFromHeaders,
  isNeonAuthUrl,
  shareInflight,
  withAuthClientIp,
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

describe("auth fetch wrapper", () => {
  const nativeFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = nativeFetch;
    delete (globalThis as typeof globalThis & { [AUTH_CLIENT_IP_FETCH]?: unknown })[
      AUTH_CLIENT_IP_FETCH
    ];
    vi.unstubAllEnvs();
  });

  it("sends the visitor address and does not call back into a later wrapper", async () => {
    const calls: string[] = [];
    const real: typeof fetch = async (_input, init) => {
      calls.push("real");
      return new Response(new Headers(init?.headers).get("x-forwarded-for"));
    };
    globalThis.fetch = real;
    vi.stubEnv("NEON_AUTH_BASE_URL", authBase);

    const first = await withAuthClientIp("203.0.113.8", () =>
      globalThis.fetch(`${authBase}/get-session`),
    );
    expect(await first.text()).toBe("203.0.113.8");

    const ours = globalThis.fetch;
    const outer: typeof fetch = (input, init) => {
      calls.push("outer");
      return ours(input, init);
    };
    globalThis.fetch = outer;

    const second = await withAuthClientIp("198.51.100.4", () =>
      globalThis.fetch(`${authBase}/sign-in/email`, { method: "POST" }),
    );
    expect(await second.text()).toBe("198.51.100.4");
    expect(calls).toEqual(["real", "outer", "real"]);
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
