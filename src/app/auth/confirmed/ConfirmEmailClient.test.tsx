/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const confirmEmailWithToken = vi.fn();

vi.mock("@/lib/auth/confirm-email-client", () => ({
  confirmEmailWithToken: (...args: unknown[]) => confirmEmailWithToken(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams("token=abc&next=%2Faccount"),
}));

import { ConfirmEmailClient } from "./ConfirmEmailClient";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  confirmEmailWithToken.mockReset();
});

describe("ConfirmEmailClient", () => {
  it("signs in from the confirmation token then leaves", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    confirmEmailWithToken.mockResolvedValue({ ok: true });
    render(<ConfirmEmailClient />);
    expect(screen.getByText("Confirming your email…")).toBeTruthy();
    await vi.waitFor(() => {
      expect(confirmEmailWithToken).toHaveBeenCalledWith("abc");
      expect(assign).toHaveBeenCalledWith("/account");
    });
  });

  it("offers sign-in when the token cannot be used", async () => {
    confirmEmailWithToken.mockResolvedValue({
      error: "This confirmation link is missing or expired.",
    });
    render(<ConfirmEmailClient />);
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/auth/sign-in?next=%2Faccount");
  });
});
