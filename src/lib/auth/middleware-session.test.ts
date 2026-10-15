import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const refreshSessionCacheHeaders = vi.fn();

vi.mock("@/lib/auth/refresh-session-on-navigation", () => ({
  refreshSessionCacheHeaders: (...args: unknown[]) =>
    refreshSessionCacheHeaders(...args),
}));

vi.mock("@/lib/auth/server", () => ({
  getAuthOrNull: () => null,
}));

import { middleware } from "../../../middleware";

describe("middleware session cache refresh", () => {
  beforeEach(() => {
    refreshSessionCacheHeaders.mockReset();
    refreshSessionCacheHeaders.mockImplementation(async (headers: Headers) => ({
      headers,
      setCookies: [],
    }));
  });

  it("forwards a minted cache cookie on a public navigation", async () => {
    refreshSessionCacheHeaders.mockImplementation(async (headers: Headers) => {
      const next = new Headers(headers);
      next.set("cookie", "session=fresh");
      return {
        headers: next,
        setCookies: ["session_data=fresh; Path=/; Max-Age=30"],
      };
    });
    const response = await middleware(
      new NextRequest("https://thegamies.gg/games", {
        headers: { cookie: "session=old" },
      }),
    );
    expect(refreshSessionCacheHeaders).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain("session_data=fresh");
    expect(response.status).toBe(200);
  });

  it("does not refresh the auth proxy route", async () => {
    await middleware(
      new NextRequest("https://thegamies.gg/api/auth/get-session"),
    );
    expect(refreshSessionCacheHeaders).not.toHaveBeenCalled();
  });
});
