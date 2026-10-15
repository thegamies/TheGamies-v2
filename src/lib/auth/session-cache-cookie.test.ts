import { describe, expect, it } from "vitest";
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
    expect(hasSessionTokenCookie(`${SESSION_TOKEN_COOKIE_NAME}=`)).toBe(false);
  });

  it("keeps the signed session cache for 4 hours", () => {
    expect(SESSION_DATA_TTL_SEC).toBe(4 * 60 * 60);
  });
});
