/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const claimNeonAuthSession = vi.fn();
const resumeAfterGoogleSignIn = vi.fn();
const clearPostAuthNext = vi.fn();

vi.mock("@/lib/auth/claim-oauth-session", () => ({
  claimNeonAuthSession: (...args: unknown[]) => claimNeonAuthSession(...args),
}));

vi.mock("./resume-after-google", () => ({
  resumeAfterGoogleSignIn: (...args: unknown[]) =>
    resumeAfterGoogleSignIn(...args),
}));

vi.mock("@/lib/auth/post-auth-next", () => ({
  clearPostAuthNext: () => clearPostAuthNext(),
}));

import { CompleteProfileSessionClient } from "./CompleteProfileSessionClient";

afterEach(() => {
  cleanup();
  claimNeonAuthSession.mockReset();
  resumeAfterGoogleSignIn.mockReset();
  clearPostAuthNext.mockReset();
  vi.unstubAllGlobals();
});

describe("CompleteProfileSessionClient", () => {
  it("returns a finished profile to the page they left", async () => {
    const replace = vi.fn();
    vi.stubGlobal("location", {
      search: "?neon_auth_session_verifier=tok",
      replace,
    });
    claimNeonAuthSession.mockResolvedValueOnce({ ok: true });
    resumeAfterGoogleSignIn.mockResolvedValueOnce({ href: "/games" });

    render(<CompleteProfileSessionClient next="/games" />);

    expect(screen.getByText("Continuing with Google…")).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/games");
    });
    expect(clearPostAuthNext).toHaveBeenCalled();
    expect(resumeAfterGoogleSignIn).toHaveBeenCalledWith("/games");
  });
});
