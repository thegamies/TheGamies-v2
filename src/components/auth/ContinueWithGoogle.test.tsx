/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithGoogle = vi.fn();
const launchGoogleSignIn = vi.fn();
const openGoogleSignInWindow = vi.fn();
const rememberPostAuthNext = vi.fn();

vi.mock("@/lib/auth/google-sign-in-client", () => ({
  GOOGLE_SIGN_IN_FAILED: "Could not continue with Google.",
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
  launchGoogleSignIn: (...args: unknown[]) => launchGoogleSignIn(...args),
  openGoogleSignInWindow: () => openGoogleSignInWindow(),
}));

vi.mock("@/lib/auth/post-auth-next", () => ({
  rememberPostAuthNext: (...args: unknown[]) => rememberPostAuthNext(...args),
}));

import { ContinueWithGoogle } from "./ContinueWithGoogle";

beforeEach(() => {
  openGoogleSignInWindow.mockReturnValue({ close: vi.fn(), closed: false });
});

afterEach(() => {
  cleanup();
  signInWithGoogle.mockReset();
  launchGoogleSignIn.mockReset();
  openGoogleSignInWindow.mockReset();
  rememberPostAuthNext.mockReset();
  vi.unstubAllGlobals();
});

describe("ContinueWithGoogle", () => {
  it("remembers next and starts Google OAuth", async () => {
    signInWithGoogle.mockResolvedValueOnce({
      href: "https://accounts.google.com/o/oauth2",
      plant: "https://auth.example/init",
    });
    render(
      <ContinueWithGoogle next="/create/goty" intent="save" />,
    );
    const button = screen.getByRole("button", {
      name: "Continue with Google",
    });
    expect(button.querySelector("svg")).toBeTruthy();
    fireEvent.click(button);
    expect(rememberPostAuthNext).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(launchGoogleSignIn).toHaveBeenCalledWith(
        {
          href: "https://accounts.google.com/o/oauth2",
          plant: "https://auth.example/init",
        },
        expect.objectContaining({ closed: false }),
      );
    });
    expect(openGoogleSignInWindow).toHaveBeenCalled();
    expect(signInWithGoogle).toHaveBeenCalledWith({
      errorCallbackPath: "/auth/sign-in",
    });
  });

  it("reads next from the current URL when props are omitted", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      assign,
      search: "?next=%2Fcreate%2Fgoty&intent=save",
    });
    signInWithGoogle.mockResolvedValueOnce({ redirected: true });
    render(<ContinueWithGoogle />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    await vi.waitFor(() => {
      expect(rememberPostAuthNext).toHaveBeenCalled();
    });
    expect(rememberPostAuthNext.mock.calls[0]?.[0]).toContain("/create/goty");
  });

  it("closes the extra window when Google cannot start", async () => {
    const close = vi.fn();
    openGoogleSignInWindow.mockReturnValue({ close, closed: false });
    signInWithGoogle.mockResolvedValueOnce({
      error: "Could not continue with Google.",
    });
    render(<ContinueWithGoogle />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(await screen.findByText("Could not continue with Google.")).toBeTruthy();
    expect(close).toHaveBeenCalled();
    expect(launchGoogleSignIn).not.toHaveBeenCalled();
  });
});
