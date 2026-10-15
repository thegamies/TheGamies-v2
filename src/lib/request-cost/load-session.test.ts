import { describe, expect, it, vi } from "vitest";
import {
  SESSION_KEEPALIVE_INTERVAL_MS,
  SESSION_KEEPALIVE_PATH,
  applySetCookieHeaders,
  ensureLoadSessionCookie,
  refreshLoadSessionCookie,
  type LoadCookieSlot,
} from "./load-session";

describe("applySetCookieHeaders", () => {
  it("replaces the session cache cookie and keeps the token", () => {
    expect(
      applySetCookieHeaders(
        "a=1; __Secure-neon-auth.session_token=old; __Secure-neon-auth.local.session_data=stale",
        [
          "__Secure-neon-auth.local.session_data=fresh; Path=/; Max-Age=300",
        ],
      ),
    ).toBe(
      "a=1; __Secure-neon-auth.session_token=old; __Secure-neon-auth.local.session_data=fresh",
    );
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
          "__Secure-neon-auth.local.session_data=fresh; Path=/",
        ],
      },
    });
    const next = await refreshLoadSessionCookie(
      "https://staging.example",
      "token=a; __Secure-neon-auth.local.session_data=stale",
      fetchImpl,
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://staging.example${SESSION_KEEPALIVE_PATH}`,
      expect.objectContaining({
        headers: expect.objectContaining({ cookie: "token=a; __Secure-neon-auth.local.session_data=stale" }),
      }),
    );
    expect(next).toContain("session_data=fresh");
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

describe("ensureLoadSessionCookie", () => {
  it("skips refresh inside the keepalive window", async () => {
    const fetchImpl = vi.fn();
    const slot: LoadCookieSlot = {
      cookie: "a=1",
      refreshedAt: Date.now(),
      inflight: null,
    };
    await ensureLoadSessionCookie(
      slot,
      "https://staging.example",
      slot.refreshedAt + SESSION_KEEPALIVE_INTERVAL_MS - 1_000,
      false,
      fetchImpl,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refreshes when forced after a 401", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        getSetCookie: () => ["session_data=new; Path=/"],
      },
    });
    const slot: LoadCookieSlot = {
      cookie: "session_data=old",
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
    expect(slot.cookie).toContain("session_data=new");
  });
});
