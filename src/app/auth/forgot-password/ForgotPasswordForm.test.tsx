/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PASSWORD_RESET_SENT } from "@/lib/auth/password";

const requestPasswordResetEmail = vi.fn();

vi.mock("@/lib/auth/password-reset-client", () => ({
  requestPasswordResetEmail: (...args: unknown[]) =>
    requestPasswordResetEmail(...args),
}));

import { ForgotPasswordForm } from "./page";

describe("ForgotPasswordForm", () => {
  it("always shows the sent copy after submit", async () => {
    requestPasswordResetEmail.mockResolvedValue({});
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Send reset link" }).closest("form")!);
    expect(await screen.findByText(PASSWORD_RESET_SENT)).toBeTruthy();
    expect(requestPasswordResetEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      redirectTo: "/auth/reset-password",
    });
  });
});
