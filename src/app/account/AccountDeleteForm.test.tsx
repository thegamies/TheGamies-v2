/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  deleteOwnAccount: vi.fn(),
}));

import { AccountDeleteForm } from "./AccountDeleteForm";

describe("AccountDeleteForm", () => {
  it("opens a danger confirm dialog", () => {
    render(<AccountDeleteForm />);
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByRole("dialog", { name: "Delete account" })).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });
});
