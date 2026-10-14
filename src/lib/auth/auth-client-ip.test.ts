import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_CLIENT_IP_FETCH,
  clientIpFromHeaders,
  isNeonAuthUrl,
  neonAuthFetchTarget,
  shareInflight,
  withAuthClientIp,
  withClientIpHeader,
} from "@/lib/auth/auth-client-ip";
import {
  NEON_AUTH_LOG_TYPE,
  neonAuthRetryAfter,
  setNeonAuthMeterSlot,
  type NeonAuthMeter,
} from "@/lib/auth/neon-auth-meter";

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

  it("keeps the Auth path and drops the query string", () => {
    expect(
      neonAuthFetchTarget(
        `${authBase}/get-session?neon_auth_session_verifier=tok`,
        undefined,
        authBase,
      ),
    ).toEqual({
      method: "GET",
      path: "/dbname/auth/get-session",
    });
    expect(
      neonAuthFetchTarget("https://thegamies.gg/api/auth/get-session", undefined, authBase),
    ).toBeNull();
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
    setNeonAuthMeterSlot(undefined);
    vi.restoreAllMocks();
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

  it("counts Auth fetches while a request meter is active", async () => {
    const meter: NeonAuthMeter = { authRoundTrips: 0, auth429s: 0 };
    setNeonAuthMeterSlot({ getStore: () => meter });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    globalThis.fetch = async () => new Response("limited", { status: 429 });
    vi.stubEnv("NEON_AUTH_BASE_URL", authBase);

    const response = await withAuthClientIp("203.0.113.8", () =>
      globalThis.fetch(`${authBase}/get-session?neon_auth_session_verifier=tok`),
    );

    expect(response.status).toBe(429);
    expect(meter).toEqual({ authRoundTrips: 1, auth429s: 1 });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      type: NEON_AUTH_LOG_TYPE,
      method: "GET",
      path: "/dbname/auth/get-session",
      status: 429,
    });
    log.mockClear();

    await withAuthClientIp(null, () => globalThis.fetch("https://thegamies.gg/games"));
    expect(meter.authRoundTrips).toBe(1);
    expect(log).not.toHaveBeenCalled();
  });

  it("records how long Neon asked us to wait on a 429", async () => {
    const meter: NeonAuthMeter = { authRoundTrips: 0, auth429s: 0 };
    setNeonAuthMeterSlot({ getStore: () => meter });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    globalThis.fetch = async () =>
      new Response("limited", {
        status: 429,
        headers: { "X-Retry-After": "8" },
      });
    vi.stubEnv("NEON_AUTH_BASE_URL", authBase);

    await withAuthClientIp("203.0.113.8", () => globalThis.fetch(`${authBase}/get-session`));

    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      type: NEON_AUTH_LOG_TYPE,
      method: "GET",
      path: "/dbname/auth/get-session",
      status: 429,
      retryAfter: "8",
    });
  });

  it("prints the wait on a local 429 when the staging meter is off", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    globalThis.fetch = async () =>
      new Response("limited", {
        status: 429,
        headers: { "retry-after": "3" },
      });
    vi.stubEnv("NEON_AUTH_BASE_URL", authBase);
    vi.stubEnv("NODE_ENV", "development");

    await withAuthClientIp(null, () => globalThis.fetch(`${authBase}/get-session`));

    expect(JSON.parse(String(log.mock.calls[0]?.[0])).retryAfter).toBe("3");
  });

  it("stays quiet in production when the meter is off", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    globalThis.fetch = async () =>
      new Response("limited", {
        status: 429,
        headers: { "X-Retry-After": "8" },
      });
    vi.stubEnv("NEON_AUTH_BASE_URL", authBase);
    vi.stubEnv("NODE_ENV", "production");

    await withAuthClientIp(null, () => globalThis.fetch(`${authBase}/get-session`));

    expect(log).not.toHaveBeenCalled();
  });
});

describe("neonAuthRetryAfter", () => {
  it("reads the wait header and ignores a blank value", () => {
    expect(neonAuthRetryAfter(new Headers({ "X-Retry-After": " 12 " }))).toBe("12");
    expect(neonAuthRetryAfter(new Headers())).toBeNull();
    expect(neonAuthRetryAfter(new Headers({ "retry-after": "   " }))).toBeNull();
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
