/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const signInWithGoogle = vi.fn();
const rememberPostAuthNext = vi.fn();

vi.mock("@/lib/auth/google-sign-in-client", () => ({
  GOOGLE_SIGN_IN_FAILED: "Could not continue with Google.",
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
}));

vi.mock("@/lib/auth/post-auth-next", () => ({
  rememberPostAuthNext: (...args: unknown[]) => rememberPostAuthNext(...args),
}));

import { ContinueWithGoogle } from "./ContinueWithGoogle";

afterEach(() => {
  cleanup();
  signInWithGoogle.mockReset();
  rememberPostAuthNext.mockReset();
  vi.unstubAllGlobals();
});

describe("ContinueWithGoogle", () => {
  it("remembers next and starts Google OAuth", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    signInWithGoogle.mockResolvedValueOnce({
      href: "https://accounts.google.com/o/oauth2",
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
      expect(assign).toHaveBeenCalledWith(
        "https://accounts.google.com/o/oauth2",
      );
    });
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
});
