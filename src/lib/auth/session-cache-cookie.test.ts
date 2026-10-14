import { describe, expect, it } from "vitest";
import { SESSION_KEEPALIVE_INTERVAL_MS } from "@/lib/auth/session-keepalive";
import {
  SESSION_DATA_COOKIE_NAME,
  SESSION_DATA_TTL_SEC,
  SESSION_TOKEN_COOKIE_NAME,
  hasSessionTokenCookie,
} from "@/lib/auth/session-cache-cookie";

describe("session cache cookie", () => {
  it("detects the session token cookie", () => {
    const token = `${SESSION_TOKEN_COOKIE_NAME}=tok`;
    expect(hasSessionTokenCookie(token)).toBe(true);
    expect(hasSessionTokenCookie(`${SESSION_DATA_COOKIE_NAME}=cache`)).toBe(
      false,
    );
    expect(hasSessionTokenCookie("other=1")).toBe(false);
  });

  it("expires before the next keepalive so that ping must mint a cookie", () => {
    expect(SESSION_DATA_TTL_SEC * 1000).toBeLessThan(
      SESSION_KEEPALIVE_INTERVAL_MS,
    );
  });
});
