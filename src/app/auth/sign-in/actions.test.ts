import { beforeEach, describe, expect, it, vi } from "vitest";

const signInEmail = vi.fn();
const skipEmailVerification = vi.fn(() => false);
const markNeonAuthEmailVerified = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

vi.mock("@/lib/auth/server", () => ({
  auth: {
    signIn: {
      email: (...args: unknown[]) => signInEmail(...args),
    },
  },
}));

vi.mock("@/lib/auth/skip-email-verification", () => ({
  skipEmailVerification: () => skipEmailVerification(),
}));

vi.mock("@/lib/auth/mark-email-verified", () => ({
  markNeonAuthEmailVerified: (...args: unknown[]) =>
    markNeonAuthEmailVerified(...args),
}));

import { signInWithEmail } from "./actions";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("signInWithEmail", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    skipEmailVerification.mockReset();
    skipEmailVerification.mockReturnValue(false);
    markNeonAuthEmailVerified.mockReset();
    redirect.mockClear();
  });

  it("sends unverified accounts to the confirm-email screen", async () => {
    signInEmail.mockResolvedValue({
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Email verification required",
      },
    });

    await expect(
      signInWithEmail(
        null,
        form({
          email: "ada@example.com",
          password: "secret",
          next: "/create/goty",
        }),
      ),
    ).rejects.toThrow(/REDIRECT:\/auth\/verify-email/);

    expect(redirect).toHaveBeenCalledWith(
      "/auth/verify-email?next=%2Fcreate%2Fgoty&email=ada%40example.com",
    );
  });

  it("marks the address verified and retries locally", async () => {
    skipEmailVerification.mockReturnValue(true);
    signInEmail
      .mockResolvedValueOnce({
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Email verification required",
        },
      })
      .mockResolvedValueOnce({ error: null });
    markNeonAuthEmailVerified.mockResolvedValueOnce(true);

    await expect(
      signInWithEmail(
        null,
        form({
          email: "ada@example.com",
          password: "secret",
          next: "/account",
        }),
      ),
    ).rejects.toThrow(/REDIRECT:\/account/);
    expect(markNeonAuthEmailVerified).toHaveBeenCalledWith({
      email: "ada@example.com",
    });
    expect(signInEmail).toHaveBeenCalledTimes(2);
  });

  it("returns other sign-in errors on the form", async () => {
    signInEmail.mockResolvedValue({
      error: { message: "Wrong password" },
    });

    await expect(
      signInWithEmail(
        null,
        form({ email: "ada@example.com", password: "nope" }),
      ),
    ).resolves.toEqual({ error: "Wrong password" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
