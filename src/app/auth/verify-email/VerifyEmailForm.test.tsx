/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  VERIFY_EMAIL_CONFIRMING,
  VERIFY_EMAIL_INVALID,
  VERIFY_EMAIL_RESENT,
  VERIFY_EMAIL_SENT,
} from "@/lib/auth/email-verification-copy";

const verifyEmailOtp = vi.fn();
const resendEmailVerificationOtp = vi.fn();

vi.mock("@/lib/auth/verify-email-client", () => ({
  verifyEmailOtp: (...args: unknown[]) => verifyEmailOtp(...args),
  resendEmailVerificationOtp: (...args: unknown[]) =>
    resendEmailVerificationOtp(...args),
}));

import { VerifyEmailForm } from "./VerifyEmailForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  verifyEmailOtp.mockReset();
  resendEmailVerificationOtp.mockReset();
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

  it("confirms from an email return link", async () => {
    verifyEmailOtp.mockResolvedValue({});
    const assign = vi.fn();
    vi.stubGlobal("location", { assign: assign });
    render(
      <VerifyEmailForm
        email="ada@example.com"
        otp="654321"
        next="/create/goty"
      />,
    );
    expect(screen.getByText(VERIFY_EMAIL_CONFIRMING)).toBeTruthy();
    await vi.waitFor(() => {
      expect(verifyEmailOtp).toHaveBeenCalledWith({
        email: "ada@example.com",
        otp: "654321",
      });
      expect(assign).toHaveBeenCalledWith("/create/goty");
    });
  });

  it("shows invalid copy when the link fails", async () => {
    verifyEmailOtp.mockResolvedValue({ error: { message: "bad" } });
    render(<VerifyEmailForm email="ada@example.com" otp="000000" />);
    expect(await screen.findByText(VERIFY_EMAIL_INVALID)).toBeTruthy();
  });

  it("sends another email without leaving the page", async () => {
    resendEmailVerificationOtp.mockResolvedValue({});
    render(<VerifyEmailForm email="ada@example.com" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Send another email" }),
    );
    expect(await screen.findByText(VERIFY_EMAIL_RESENT)).toBeTruthy();
    expect(resendEmailVerificationOtp).toHaveBeenCalledWith({
      email: "ada@example.com",
    });
  });

  it("requests a link after sign-in when none is in the URL", async () => {
    resendEmailVerificationOtp.mockResolvedValue({});
    render(
      <VerifyEmailForm email="ada@example.com" sendCodeOnMount />,
    );
    await vi.waitFor(() => {
      expect(resendEmailVerificationOtp).toHaveBeenCalledWith({
        email: "ada@example.com",
      });
    });
    expect(screen.getByText(VERIFY_EMAIL_SENT)).toBeTruthy();
  });
});
