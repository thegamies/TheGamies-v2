/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PASSWORD_RESET_SENT } from "@/lib/auth/password";

vi.mock("@/lib/auth/password-reset-client", () => ({
  requestPasswordResetEmail: vi.fn(),
}));

import ForgotPasswordPage from "./page";

describe("ForgotPasswordPage", () => {
  it("asks for email and links back to sign in", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Send reset link" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByText(PASSWORD_RESET_SENT)).toBeNull();
  });
});
