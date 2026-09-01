/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountDeleteForm } from "./AccountDeleteForm";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AccountDeleteForm", () => {
  it("opens a danger confirm dialog", () => {
    render(<AccountDeleteForm hasPassword />);
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByRole("dialog", { name: "Delete account" })).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("posts to the delete API then leaves the site", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AccountDeleteForm hasPassword />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method?: string; body?: FormData },
    ];
    expect(url).toBe("/api/account/delete");
    expect(init.method).toBe("POST");
    expect(init.body?.get("password")).toBe("secret");
    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith("/");
    });
  });

  it("keeps the dialog open when delete is rejected", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "That password is incorrect." }),
      }),
    );

    render(<AccountDeleteForm hasPassword />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "nope" },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "That password is incorrect.",
    );
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Delete account" })).toBeTruthy();
  });

  it("sends passwordless accounts to Forgot password", () => {
    render(<AccountDeleteForm hasPassword={false} />);
    expect(screen.getByText(/does not have a password yet/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    const dialog = screen.getByRole("dialog", { name: "Delete account" });
    expect(within(dialog).queryByLabelText("Password")).toBeNull();
    expect(
      within(dialog).getByRole("link", { name: "Forgot password" }),
    ).toHaveAttribute("href", "/auth/forgot-password");
  });
});
