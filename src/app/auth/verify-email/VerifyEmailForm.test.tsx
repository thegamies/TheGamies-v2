/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VERIFY_EMAIL_RESENT, VERIFY_EMAIL_SENT } from "@/lib/auth/email-verification-copy";

const sendVerificationLink = vi.fn();

vi.mock("@/lib/auth/verify-email-client", () => ({
  sendVerificationLink: (...args: unknown[]) => sendVerificationLink(...args),
}));

import { VerifyEmailForm } from "./VerifyEmailForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sendVerificationLink.mockReset();
});

describe("VerifyEmailForm", () => {
  it("asks people to open the email link, not enter a code", () => {
    render(<VerifyEmailForm email="ada@example.com" />);
    expect(screen.getByText(VERIFY_EMAIL_SENT)).toBeTruthy();
    expect(screen.queryByLabelText("Confirmation code")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Send another email" }),
    ).toBeTruthy();
  });

  it("sends another verification link without leaving the page", async () => {
    sendVerificationLink.mockResolvedValue({});
    vi.stubGlobal("location", { origin: "https://thegamies.gg" });
    render(<VerifyEmailForm email="ada@example.com" next="/create/goty" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Send another email" }),
    );
    expect(await screen.findByText(VERIFY_EMAIL_RESENT)).toBeTruthy();
    expect(sendVerificationLink).toHaveBeenCalledWith({
      email: "ada@example.com",
      callbackURL:
        "https://thegamies.gg/auth/confirmed?next=%2Fcreate%2Fgoty",
    });
  });

  it("requests a link after unverified sign-in", async () => {
    sendVerificationLink.mockResolvedValue({});
    vi.stubGlobal("location", { origin: "https://thegamies.gg" });
    render(
      <VerifyEmailForm email="ada@example.com" sendOnMount />,
    );
    await vi.waitFor(() => {
      expect(sendVerificationLink).toHaveBeenCalledWith({
        email: "ada@example.com",
        callbackURL:
          "https://thegamies.gg/auth/confirmed?next=%2Faccount",
      });
    });
    expect(screen.getByText(VERIFY_EMAIL_SENT)).toBeTruthy();
  });
});
