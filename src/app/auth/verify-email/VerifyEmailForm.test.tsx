/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  VERIFY_EMAIL_INVALID,
  VERIFY_EMAIL_RESENT,
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
  it("confirms a code and continues", async () => {
    verifyEmailOtp.mockResolvedValue({});
    const assign = vi.fn();
    vi.stubGlobal("location", { assign: assign });
    render(<VerifyEmailForm email="ada@example.com" next="/account" />);
    fireEvent.change(screen.getByLabelText("Confirmation code"), {
      target: { value: "123456" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Confirm email" }).closest("form")!,
    );
    await vi.waitFor(() => {
      expect(verifyEmailOtp).toHaveBeenCalledWith({
        email: "ada@example.com",
        otp: "123456",
      });
      expect(assign).toHaveBeenCalledWith("/account");
    });
  });

  it("shows invalid copy when the code fails", async () => {
    verifyEmailOtp.mockResolvedValue({ error: { message: "bad" } });
    render(<VerifyEmailForm email="ada@example.com" />);
    fireEvent.change(screen.getByLabelText("Confirmation code"), {
      target: { value: "000000" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Confirm email" }).closest("form")!,
    );
    expect(await screen.findByText(VERIFY_EMAIL_INVALID)).toBeTruthy();
  });

  it("sends another code without leaving the page", async () => {
    resendEmailVerificationOtp.mockResolvedValue({});
    render(<VerifyEmailForm email="ada@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Send another code" }));
    expect(await screen.findByText(VERIFY_EMAIL_RESENT)).toBeTruthy();
    expect(resendEmailVerificationOtp).toHaveBeenCalledWith({
      email: "ada@example.com",
    });
  });
});
