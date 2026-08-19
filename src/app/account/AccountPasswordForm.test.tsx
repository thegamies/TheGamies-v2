/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/change-password-client", () => ({
  changeSignedInPassword: vi.fn(),
}));

import { AccountPasswordForm } from "./AccountPasswordForm";

describe("AccountPasswordForm", () => {
  it("shows current, new, and confirm fields", () => {
    render(<AccountPasswordForm />);
    expect(screen.getByLabelText("Current password")).toBeTruthy();
    expect(screen.getByLabelText("New password")).toBeTruthy();
    expect(screen.getByLabelText("Confirm new password")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeTruthy();
  });
});
