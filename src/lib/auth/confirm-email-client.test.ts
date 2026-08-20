import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyEmail = vi.fn();

vi.mock("./client", () => ({
  authClient: {
    verifyEmail: (...args: unknown[]) => verifyEmail(...args),
  },
}));

import { confirmEmailWithToken } from "./confirm-email-client";

describe("confirmEmailWithToken", () => {
  beforeEach(() => {
    verifyEmail.mockReset();
  });

  it("uses the Auth client so a session cookie can be stored", async () => {
    verifyEmail.mockResolvedValueOnce({ error: null });
    await expect(confirmEmailWithToken("abc")).resolves.toEqual({ ok: true });
    expect(verifyEmail).toHaveBeenCalledWith({ query: { token: "abc" } });
  });

  it("rejects a blank token", async () => {
    await expect(confirmEmailWithToken("")).resolves.toEqual({
      error: "This confirmation link is missing or expired.",
    });
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
