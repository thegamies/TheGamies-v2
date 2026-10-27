import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SESSION_DATA_COOKIE_NAME,
  SESSION_DATA_TTL_SEC,
  SESSION_TOKEN_COOKIE_NAME,
} from "@/lib/auth/session-cache-cookie";

const validateSessionData = vi.fn();
const handleAuthProxyRequest = vi.fn();

vi.mock("@neondatabase/auth/server", () => ({
  validateSessionData: (...args: unknown[]) => validateSessionData(...args),
  handleAuthProxyRequest: (...args: unknown[]) => handleAuthProxyRequest(...args),
}));

import { refreshSessionCacheHeaders } from "./refresh-session-on-navigation";

const secret = "x".repeat(32);

function headersWith(cookie: string): Headers {
  return new Headers({ cookie });
}

describe("refreshSessionCacheHeaders", () => {
  beforeEach(() => {
    validateSessionData.mockReset();
    handleAuthProxyRequest.mockReset();
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example/neondb/auth");
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", secret);
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("DATABASE_URL", "");
  });

  it("skips Neon mint when self-hosted Better Auth is on", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", secret);
    vi.stubEnv("DATABASE_URL", "postgres://example");
    const result = await refreshSessionCacheHeaders(
      headersWith(`${SESSION_TOKEN_COOKIE_NAME}=tok`),
      "https://thegamies.gg/",
    );
    expect(result.setCookies).toEqual([]);
    expect(handleAuthProxyRequest).not.toHaveBeenCalled();
  });

  it("does not call Neon when there is no login cookie", async () => {
    const result = await refreshSessionCacheHeaders(
      headersWith("other=1"),
      "https://thegamies.gg/",
    );
    expect(result.setCookies).toEqual([]);
    expect(result.headers.get("cookie")).toBe("other=1");
    expect(validateSessionData).not.toHaveBeenCalled();
    expect(handleAuthProxyRequest).not.toHaveBeenCalled();
  });

  it("does not call Neon when the session cache is still valid", async () => {
    validateSessionData.mockResolvedValue({ valid: true, payload: { session: {} } });
    const cookie = `${SESSION_TOKEN_COOKIE_NAME}=tok; ${SESSION_DATA_COOKIE_NAME}=cache`;
    const result = await refreshSessionCacheHeaders(
      headersWith(cookie),
      "https://thegamies.gg/games",
    );
    expect(result.setCookies).toEqual([]);
    expect(result.headers.get("cookie")).toBe(cookie);
    expect(handleAuthProxyRequest).not.toHaveBeenCalled();
    expect(validateSessionData).toHaveBeenCalledWith("cache", secret);
  });

  it("mints through Neon and forwards the new cache cookie on the same request", async () => {
    const minted = `${SESSION_DATA_COOKIE_NAME}=fresh; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=30`;
    handleAuthProxyRequest.mockResolvedValue(
      new Response(null, { headers: { "set-cookie": minted } }),
    );
    const result = await refreshSessionCacheHeaders(
      headersWith(`${SESSION_TOKEN_COOKIE_NAME}=tok`),
      "https://thegamies.gg/",
    );
    expect(handleAuthProxyRequest).toHaveBeenCalledOnce();
    const call = handleAuthProxyRequest.mock.calls[0]?.[0] as {
      path: string;
      sessionDataTtl: number;
      sameSite: string;
      request: Request;
    };
    expect(call.path).toBe("get-session");
    expect(call.sessionDataTtl).toBe(SESSION_DATA_TTL_SEC);
    expect(call.sameSite).toBe("lax");
    expect(call.request.method).toBe("GET");
    expect(result.setCookies).toEqual([minted]);
    expect(result.headers.get("cookie")).toContain(`${SESSION_TOKEN_COOKIE_NAME}=tok`);
    expect(result.headers.get("cookie")).toContain(`${SESSION_DATA_COOKIE_NAME}=fresh`);
  });

  it("mints again when the cache cookie fails validation", async () => {
    validateSessionData.mockResolvedValue({ valid: false });
    handleAuthProxyRequest.mockResolvedValue(new Response(null));
    await refreshSessionCacheHeaders(
      headersWith(`${SESSION_TOKEN_COOKIE_NAME}=tok; ${SESSION_DATA_COOKIE_NAME}=stale`),
      "https://thegamies.gg/",
    );
    expect(handleAuthProxyRequest).toHaveBeenCalledOnce();
  });

  it("shares one mint when two navigations arrive together", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const minted = `${SESSION_DATA_COOKIE_NAME}=fresh; Path=/; Max-Age=30`;
    handleAuthProxyRequest.mockImplementation(async () => {
      await gate;
      return new Response(null, { headers: { "set-cookie": minted } });
    });
    const cookie = `${SESSION_TOKEN_COOKIE_NAME}=tok`;
    const first = refreshSessionCacheHeaders(headersWith(cookie), "https://thegamies.gg/");
    const second = refreshSessionCacheHeaders(headersWith(cookie), "https://thegamies.gg/games");
    await vi.waitFor(() => expect(handleAuthProxyRequest).toHaveBeenCalledOnce());
    release?.();
    const results = await Promise.all([first, second]);
    expect(handleAuthProxyRequest).toHaveBeenCalledOnce();
    expect(results[0]?.headers.get("cookie")).toContain(`${SESSION_DATA_COOKIE_NAME}=fresh`);
    expect(results[1]?.headers.get("cookie")).toContain(`${SESSION_DATA_COOKIE_NAME}=fresh`);
  });

  it("leaves the request alone when Neon returns no cookie", async () => {
    handleAuthProxyRequest.mockResolvedValue(new Response("limited", { status: 429 }));
    const cookie = `${SESSION_TOKEN_COOKIE_NAME}=tok`;
    const result = await refreshSessionCacheHeaders(
      headersWith(cookie),
      "https://thegamies.gg/",
    );
    expect(result.setCookies).toEqual([]);
    expect(result.headers.get("cookie")).toBe(cookie);
  });
});
