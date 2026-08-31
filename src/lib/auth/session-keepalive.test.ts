import { describe, expect, it, vi } from "vitest";
import {
  SESSION_KEEPALIVE_PATH,
  refreshSessionCookie,
} from "./session-keepalive";

describe("refreshSessionCookie", () => {
  it("hits the Auth get-session handler with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await expect(refreshSessionCookie()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(SESSION_KEEPALIVE_PATH, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    vi.unstubAllGlobals();
  });

  it("returns false when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    await expect(refreshSessionCookie()).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});
