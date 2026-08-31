import { beforeEach, describe, expect, it, vi } from "vitest";

const signUpEmail = vi.fn();
const ensureProfileForAuthUser = vi.fn();
const skipEmailVerification = vi.fn(() => false);
const markNeonAuthEmailVerified = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "http://localhost:3000" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

const getSession = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  auth: {
    signUp: {
      email: (...args: unknown[]) => signUpEmail(...args),
    },
    getSession: (...args: unknown[]) => getSession(...args),
  },
}));

vi.mock("@/lib/profile/service", () => ({
  ensureProfileForAuthUser: (...args: unknown[]) =>
    ensureProfileForAuthUser(...args),
}));

vi.mock("@/lib/auth/skip-email-verification", () => ({
  skipEmailVerification: () => skipEmailVerification(),
}));

vi.mock("@/lib/auth/mark-email-verified", () => ({
  markNeonAuthEmailVerified: (...args: unknown[]) =>
    markNeonAuthEmailVerified(...args),
}));

import { signUpWithEmail } from "./actions";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

const fields = {
  email: "ada@example.com",
  password: "secret12",
  displayName: "Ada",
  username: "ada",
  next: "/account",
};

describe("signUpWithEmail", () => {
  beforeEach(() => {
    signUpEmail.mockReset();
    getSession.mockReset();
    getSession.mockResolvedValue({ data: null });
    ensureProfileForAuthUser.mockReset();
    skipEmailVerification.mockReset();
    skipEmailVerification.mockReturnValue(false);
    markNeonAuthEmailVerified.mockReset();
    redirect.mockClear();
    ensureProfileForAuthUser.mockResolvedValue({
      profile: { id: "p1", username: "ada" },
    });
  });

  it("asks hosted sign-ups to confirm email", async () => {
    signUpEmail.mockResolvedValue({
      data: { user: { id: "user-1", emailVerified: false } },
      error: null,
    });

    await expect(signUpWithEmail(null, form(fields))).resolves.toEqual({
      needsVerification: true,
      email: "ada@example.com",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("skips confirm-email when Neon already issued a session", async () => {
    signUpEmail.mockResolvedValue({
      data: {
        user: { id: "user-1", emailVerified: false },
        session: { id: "sess-1" },
      },
      error: null,
    });

    await expect(signUpWithEmail(null, form(fields))).rejects.toThrow(
      /REDIRECT:\/account/,
    );
    expect(markNeonAuthEmailVerified).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("skips confirm-email when the new account already has a session cookie", async () => {
    signUpEmail.mockResolvedValue({
      data: { user: { id: "user-1", emailVerified: false } },
      error: null,
    });
    getSession.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    await expect(signUpWithEmail(null, form(fields))).rejects.toThrow(
      /REDIRECT:\/account/,
    );
    expect(markNeonAuthEmailVerified).not.toHaveBeenCalled();
  });

  it("skips confirm-email in local development", async () => {
    skipEmailVerification.mockReturnValue(true);
    signUpEmail.mockResolvedValue({
      data: { user: { id: "user-1", emailVerified: false } },
      error: null,
    });
    markNeonAuthEmailVerified.mockResolvedValue(true);

    await expect(signUpWithEmail(null, form(fields))).rejects.toThrow(
      /REDIRECT:\/account/,
    );
    expect(markNeonAuthEmailVerified).toHaveBeenCalledWith({
      authUserId: "user-1",
      email: "ada@example.com",
    });
  });
});
