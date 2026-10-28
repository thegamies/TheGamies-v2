import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_CLIENT_IP_FETCH,
  clientIpFromHeaders,
  shareInflight,
  withAuthClientIp,
} from "@/lib/auth/auth-client-ip";

describe("clientIpFromHeaders", () => {
  it("accepts a single IPv4 from cf-connecting-ip", () => {
    expect(
      clientIpFromHeaders(new Headers({ "cf-connecting-ip": "203.0.113.9" })),
    ).toBe("203.0.113.9");
  });

  it("rejects comma-separated or empty values", () => {
    expect(
      clientIpFromHeaders(
        new Headers({ "cf-connecting-ip": "203.0.113.9, 198.51.100.1" }),
      ),
    ).toBeNull();
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });
});

describe("shareInflight", () => {
  it("shares one promise for the same key", async () => {
    let runs = 0;
    const inflight = new Map<string, Promise<number>>();
    const first = shareInflight(inflight, "a", async () => {
      runs += 1;
      await Promise.resolve();
      return 1;
    });
    const second = shareInflight(inflight, "a", async () => {
      runs += 1;
      return 2;
    });
    await expect(Promise.all([first, second])).resolves.toEqual([1, 1]);
    expect(runs).toBe(1);
  });
});

describe("withAuthClientIp", () => {
  beforeEach(() => {
    delete (globalThis as typeof globalThis & {
      [AUTH_CLIENT_IP_FETCH]?: unknown;
    })[AUTH_CLIENT_IP_FETCH];
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & {
      [AUTH_CLIENT_IP_FETCH]?: unknown;
    })[AUTH_CLIENT_IP_FETCH];
  });

  it("runs the callback with or without an IP", () => {
    expect(withAuthClientIp(null, () => "ok")).toBe("ok");
    expect(withAuthClientIp("203.0.113.9", () => "ok")).toBe("ok");
  });
});
