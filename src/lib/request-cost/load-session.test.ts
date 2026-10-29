import { describe, expect, it, vi } from "vitest";
import {
  SESSION_KEEPALIVE_INTERVAL_MS,
  SESSION_KEEPALIVE_PATH,
  applySetCookieHeaders,
  emptyLoadCookieSlot,
  ensureLoadSessionCookie,
  maintainLoadSessionCookie,
  refreshLoadSessionCookie,
  type LoadCookieSlot,
} from "./load-session";

describe("applySetCookieHeaders", () => {
  it("replaces a session cookie and keeps others", () => {
    expect(
      applySetCookieHeaders(
        "a=1; __Secure-better-auth.session_token=old; other=stale",
        ["__Secure-better-auth.session_token=fresh; Path=/; Max-Age=300"],
      ),
    ).toBe("a=1; __Secure-better-auth.session_token=fresh; other=stale");
  });

  it("drops a cookie with Max-Age=0", () => {
    expect(
      applySetCookieHeaders("keep=1; gone=x", ["gone=; Max-Age=0; Path=/"]),
    ).toBe("keep=1");
  });
});

describe("refreshLoadSessionCookie", () => {
  it("hits get-session and merges Set-Cookie", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        getSetCookie: () => [
          "__Secure-better-auth.session_token=fresh; Path=/",
        ],
      },
    });
    const next = await refreshLoadSessionCookie(
      "https://staging.example",
      "token=a; __Secure-better-auth.session_token=stale",
      fetchImpl,
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://staging.example${SESSION_KEEPALIVE_PATH}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "token=a; __Secure-better-auth.session_token=stale",
        }),
      }),
    );
    expect(next).toContain("session_token=fresh");
    expect(next).toContain("token=a");
  });

  it("returns null when get-session is unauthorized", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      headers: { getSetCookie: () => [] },
    });
    await expect(
      refreshLoadSessionCookie("https://staging.example", "a=1", fetchImpl),
    ).resolves.toBeNull();
  });
});

describe("maintainLoadSessionCookie", () => {
  it("skips refresh inside the keepalive window", async () => {
    const fetchImpl = vi.fn();
    const slot = emptyLoadCookieSlot("a=1");
    const result = await maintainLoadSessionCookie(
      slot,
      "https://staging.example",
      slot.refreshedAt + SESSION_KEEPALIVE_INTERVAL_MS - 1_000,
      false,
      fetchImpl,
    );
    expect(result).toEqual({ action: "skip" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports refresh-failed when get-session rejects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      headers: { getSetCookie: () => [] },
    });
    const slot = emptyLoadCookieSlot("session_token=old");
    slot.refreshedAt = 0;
    const result = await maintainLoadSessionCookie(
      slot,
      "https://staging.example",
      Date.now(),
      true,
      fetchImpl,
    );
    expect(result.action).toBe("refresh-failed");
  });

  it("refreshes when forced after a 401", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        getSetCookie: () => ["session_token=new; Path=/"],
      },
    });
    const slot: LoadCookieSlot = {
      cookie: "session_token=old",
      refreshedAt: Date.now(),
      inflight: null,
    };
    await ensureLoadSessionCookie(
      slot,
      "https://staging.example",
      Date.now(),
      true,
      fetchImpl,
    );
    expect(fetchImpl).toHaveBeenCalled();
    expect(slot.cookie).toContain("session_token=new");
  });
});
