/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const deleteOwnAccount = vi.fn();

vi.mock("./actions", () => ({
  deleteOwnAccount: (...args: unknown[]) => deleteOwnAccount(...args),
}));

import { AccountDeleteForm } from "./AccountDeleteForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  deleteOwnAccount.mockReset();
});

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

  it("leaves the site after a successful delete", async () => {
    deleteOwnAccount.mockResolvedValue({ ok: true });
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    render(<AccountDeleteForm />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith("/");
    });
  });
});
