import { beforeEach, describe, expect, it, vi } from "vitest";

const signInEmail = vi.fn();
const clearStaleAuthCookies = vi.fn();
const markVerifiedForLocalDev = vi.fn();

vi.mock("./client", () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => signInEmail(...args),
    },
  },
}));

vi.mock("@/app/auth/sign-in/actions", () => ({
  clearStaleAuthCookies: (...args: unknown[]) => clearStaleAuthCookies(...args),
  markVerifiedForLocalDev: (...args: unknown[]) =>
    markVerifiedForLocalDev(...args),
}));

import { signInOnThisOrigin } from "./sign-in-client";

describe("signInOnThisOrigin", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    clearStaleAuthCookies.mockReset();
    markVerifiedForLocalDev.mockReset();
    clearStaleAuthCookies.mockResolvedValue(undefined);
    markVerifiedForLocalDev.mockResolvedValue(false);
  });

  it("clears leftover Auth cookies then signs in through the client", async () => {
    signInEmail.mockResolvedValueOnce({ error: null });
    await expect(
      signInOnThisOrigin({
        email: "ada@example.com",
        password: "secret",
        next: "/admin/sync",
      }),
    ).resolves.toEqual({ href: "/admin/sync" });
    expect(clearStaleAuthCookies).toHaveBeenCalled();
    expect(signInEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "secret",
    });
  });

  it("sends unverified accounts to the confirm-email screen", async () => {
    signInEmail.mockResolvedValueOnce({
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Email verification required",
      },
    });
    await expect(
      signInOnThisOrigin({
        email: "ada@example.com",
        password: "secret",
        next: "/create/goty",
      }),
    ).resolves.toEqual({
      href: "/auth/verify-email?next=%2Fcreate%2Fgoty&email=ada%40example.com",
    });
  });

  it("sends JSON-wrapped unverified errors to the confirm-email screen", async () => {
    signInEmail.mockResolvedValueOnce({
      error: {
        message:
          '{"message":"Email verification required","code":"EMAIL_NOT_VERIFIED"}',
      },
    });
    await expect(
      signInOnThisOrigin({
        email: "ada@example.com",
        password: "secret",
      }),
    ).resolves.toEqual({
      href: "/auth/verify-email?email=ada%40example.com",
    });
  });

  it("retries after local confirm-email skip", async () => {
    markVerifiedForLocalDev.mockResolvedValueOnce(true);
    signInEmail
      .mockResolvedValueOnce({
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Email verification required",
        },
      })
      .mockResolvedValueOnce({ error: null });
    await expect(
      signInOnThisOrigin({
        email: "ada@example.com",
        password: "secret",
        next: "/account",
      }),
    ).resolves.toEqual({ href: "/account" });
    expect(signInEmail).toHaveBeenCalledTimes(2);
  });

  it("returns other sign-in errors", async () => {
    signInEmail.mockResolvedValueOnce({
      error: { message: "Wrong password" },
    });
    await expect(
      signInOnThisOrigin({
        email: "ada@example.com",
        password: "nope",
      }),
    ).resolves.toEqual({ error: "Wrong password" });
  });
});
