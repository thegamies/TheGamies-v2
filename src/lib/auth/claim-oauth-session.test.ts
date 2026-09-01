/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();

vi.mock("./client", () => ({
  authClient: {
    getSession: (...args: unknown[]) => getSession(...args),
  },
}));

import { claimNeonAuthSession } from "./claim-oauth-session";
import { GOOGLE_SIGN_IN_FAILED } from "./google-sign-in-client";
import { neonAuthSessionVerifierFromSearch } from "./neon-auth-session-verifier";

describe("neonAuthSessionVerifierFromSearch", () => {
  it("reads a non-empty verifier", () => {
    expect(neonAuthSessionVerifierFromSearch("abc")).toBe("abc");
    expect(neonAuthSessionVerifierFromSearch("  ")).toBeNull();
    expect(neonAuthSessionVerifierFromSearch(undefined)).toBeNull();
  });
});

describe("claimNeonAuthSession", () => {
  beforeEach(() => {
    getSession.mockReset();
    vi.unstubAllGlobals();
  });

  it("treats a session user as success", async () => {
    getSession.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
    });
    await expect(claimNeonAuthSession("tok")).resolves.toEqual({ ok: true });
  });

  it("fetches get-session when the client has no user yet", async () => {
    getSession.mockResolvedValueOnce({ data: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-1" } }),
      }),
    );
    await expect(claimNeonAuthSession("tok")).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/get-session?neon_auth_session_verifier=tok",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
      }),
    );
  });

  it("rejects a blank verifier", async () => {
    await expect(claimNeonAuthSession("")).resolves.toEqual({
      error: GOOGLE_SIGN_IN_FAILED,
    });
    expect(getSession).not.toHaveBeenCalled();
  });
});
