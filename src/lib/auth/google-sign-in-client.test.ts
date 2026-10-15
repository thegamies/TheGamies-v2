import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInSocial = vi.fn();

vi.mock("./client", () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => signInSocial(...args),
    },
  },
}));

import {
  GOOGLE_ACCOUNT_NOT_LINKED,
  GOOGLE_SIGN_IN_FAILED,
  googleOAuthReturnMessage,
  googleSignInLaunch,
  launchGoogleSignIn,
  openGoogleSignInWindow,
  signInWithGoogle,
  withGoogleAccountPicker,
} from "./google-sign-in-client";
import { GOOGLE_COMPLETE_PROFILE_PATH } from "./return-to";

describe("signInWithGoogle", () => {
  beforeEach(() => {
    signInSocial.mockReset();
  });

  it("starts Google OAuth through the Auth proxy", async () => {
    signInSocial.mockResolvedValueOnce({
      data: { url: "https://accounts.google.com/o/oauth2" },
      error: null,
    });
    await expect(
      signInWithGoogle({ errorCallbackPath: "/auth/sign-up" }),
    ).resolves.toEqual({
      href: "https://accounts.google.com/o/oauth2?prompt=select_account",
    });
    expect(signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: GOOGLE_COMPLETE_PROFILE_PATH,
      newUserCallbackURL: GOOGLE_COMPLETE_PROFILE_PATH,
      errorCallbackURL: "/auth/sign-up",
      disableRedirect: true,
      additionalParams: { prompt: "select_account" },
    });
  });

  it("falls back to sign-in for an unsafe error return path", async () => {
    signInSocial.mockResolvedValueOnce({ data: { url: "https://g" }, error: null });
    await signInWithGoogle({ errorCallbackPath: "/\\evil.com" });
    expect(signInSocial).toHaveBeenCalledWith(
      expect.objectContaining({ errorCallbackURL: "/auth/sign-in" }),
    );
  });

  it("returns product copy when Google OAuth fails", async () => {
    signInSocial.mockResolvedValueOnce({
      error: { message: "OAuth not configured" },
    });
    await expect(signInWithGoogle({})).resolves.toEqual({
      error: "OAuth not configured",
    });
  });

  it("hides JSON Auth failures", async () => {
    signInSocial.mockResolvedValueOnce({
      error: {
        code: "INVALID_CALLBACK_URL",
        message: '{"code":"INVALID_CALLBACK_URL"}',
      },
    });
    await expect(signInWithGoogle({})).resolves.toEqual({
      error: GOOGLE_SIGN_IN_FAILED,
    });
  });
});

describe("googleSignInLaunch", () => {
  it("loads the auth hop before the account chooser", async () => {
    const init =
      "https://auth.example/neondb/auth/sign-in/social/init?token=abc";
    const chooser =
      "https://accounts.google.com/o/oauth2/v2/auth?prompt=select_account";
    await expect(googleSignInLaunch(init, async () => chooser)).resolves.toEqual(
      { href: chooser, plant: init },
    );
  });

  it("keeps the original URL when the chooser is unavailable", async () => {
    const init = "https://auth.example/init";
    await expect(googleSignInLaunch(init, async () => null)).resolves.toEqual({
      href: init,
    });
  });
});

describe("openGoogleSignInWindow", () => {
  it("opens during the click so the auth hop can store its cookie", () => {
    const append = vi.fn();
    const open = vi.fn(() => ({
      document: {
        title: "",
        body: { replaceChildren: append },
        createElement: () => ({ textContent: "" }),
      },
    }));
    const popup = openGoogleSignInWindow({ open } as unknown as Window);
    expect(open).toHaveBeenCalledWith("about:blank", "google-sign-in");
    expect(popup).not.toBeNull();
    expect(append).toHaveBeenCalled();
  });
});

describe("launchGoogleSignIn", () => {
  const chooser =
    "https://accounts.google.com/o/oauth2/v2/auth?prompt=select_account";
  const plant = "https://auth.example/init";

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("closes the auth hop and asks Google which account to use", async () => {
    const replace = vi.fn();
    const close = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null))),
    );
    launchGoogleSignIn(
      { href: chooser, plant },
      {
        closed: false,
        close,
        focus: vi.fn(),
        location: { replace, href: "about:blank" },
      } as unknown as Window,
      {
        location: { assign, origin: "http://localhost:3000" },
      } as unknown as Window,
    );
    expect(replace).toHaveBeenCalledWith(plant);
    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith(chooser);
    });
    expect(close).toHaveBeenCalled();
  });

  it("leaves a hop that already returned to this site", async () => {
    const close = vi.fn();
    const assign = vi.fn();
    const focus = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null))),
    );
    launchGoogleSignIn(
      { href: chooser, plant },
      {
        closed: false,
        close,
        focus,
        location: {
          replace: vi.fn(),
          href: "http://localhost:3000/auth/complete-profile",
        },
      } as unknown as Window,
      {
        location: { assign, origin: "http://localhost:3000" },
      } as unknown as Window,
    );
    await vi.waitFor(() => {
      expect(focus).toHaveBeenCalledTimes(1);
    });
    expect(close).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("stays on the auth hop when a new window is blocked", () => {
    const assign = vi.fn();
    launchGoogleSignIn(
      { href: chooser, plant },
      null,
      {
        location: { assign, origin: "http://localhost:3000" },
        open: () => null,
      } as unknown as Window,
    );
    expect(assign).toHaveBeenCalledWith(plant);
  });
});

describe("withGoogleAccountPicker", () => {
  it("asks Google to show the account chooser", () => {
    expect(
      withGoogleAccountPicker(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id=1",
      ),
    ).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=1&prompt=select_account",
    );
  });

  it("replaces a silent prompt and keeps consent", () => {
    expect(
      withGoogleAccountPicker(
        "https://accounts.google.com/o/oauth2/v2/auth?prompt=none",
      ),
    ).toBe("https://accounts.google.com/o/oauth2/v2/auth?prompt=select_account");
    expect(
      withGoogleAccountPicker(
        "https://accounts.google.co.uk/o/oauth2/v2/auth?prompt=consent",
      ),
    ).toBe(
      "https://accounts.google.co.uk/o/oauth2/v2/auth?prompt=consent+select_account",
    );
  });

  it("leaves other hosts unchanged", () => {
    expect(withGoogleAccountPicker("https://example.com/auth?prompt=none")).toBe(
      "https://example.com/auth?prompt=none",
    );
    expect(withGoogleAccountPicker("/auth/sign-in")).toBe("/auth/sign-in");
  });
});

describe("googleOAuthReturnMessage", () => {
  it("explains an unlinked Google email", () => {
    expect(googleOAuthReturnMessage("account_not_linked")).toBe(
      GOOGLE_ACCOUNT_NOT_LINKED,
    );
  });

  it("uses generic copy for other return errors", () => {
    expect(googleOAuthReturnMessage("access_denied")).toBe(
      GOOGLE_SIGN_IN_FAILED,
    );
    expect(googleOAuthReturnMessage(null)).toBeNull();
  });
});
