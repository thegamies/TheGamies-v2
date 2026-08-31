import { beforeEach, describe, expect, it, vi } from "vitest";

const skipEmailVerification = vi.fn(() => false);
const markNeonAuthEmailVerified = vi.fn();
const cookieSet = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      cookie: "better-auth.session_token=stale; tg_list_edit=keep",
    }),
  cookies: async () => ({
    set: (...args: unknown[]) => cookieSet(...args),
  }),
}));

vi.mock("@/lib/auth/skip-email-verification", () => ({
  skipEmailVerification: () => skipEmailVerification(),
}));

vi.mock("@/lib/auth/mark-email-verified", () => ({
  markNeonAuthEmailVerified: (...args: unknown[]) =>
    markNeonAuthEmailVerified(...args),
}));

import {
  clearStaleAuthCookies,
  markVerifiedForLocalDev,
} from "./actions";

describe("clearStaleAuthCookies", () => {
  beforeEach(() => {
    cookieSet.mockReset();
  });

  it("expires Auth cookies and leaves app cookies", async () => {
    await clearStaleAuthCookies();
    expect(cookieSet).toHaveBeenCalledTimes(1);
    expect(cookieSet.mock.calls[0]?.[0]).toBe("better-auth.session_token");
    expect(cookieSet.mock.calls[0]?.[1]).toBe("");
    expect(cookieSet.mock.calls[0]?.[2]).toMatchObject({ maxAge: 0 });
  });
});

describe("markVerifiedForLocalDev", () => {
  beforeEach(() => {
    skipEmailVerification.mockReset();
    skipEmailVerification.mockReturnValue(false);
    markNeonAuthEmailVerified.mockReset();
  });

  it("is a no-op on hosted deploys", async () => {
    await expect(markVerifiedForLocalDev("ada@example.com")).resolves.toBe(
      false,
    );
    expect(markNeonAuthEmailVerified).not.toHaveBeenCalled();
  });

  it("marks the address verified locally", async () => {
    skipEmailVerification.mockReturnValue(true);
    markNeonAuthEmailVerified.mockResolvedValueOnce(true);
    await expect(markVerifiedForLocalDev("ada@example.com")).resolves.toBe(
      true,
    );
    expect(markNeonAuthEmailVerified).toHaveBeenCalledWith({
      email: "ada@example.com",
    });
  });
});
