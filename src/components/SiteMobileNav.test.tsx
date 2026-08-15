/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteMobileNav } from "./SiteMobileNav";

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

vi.mock("next/navigation", () => ({
  usePathname: () => "/game-of-the-year/2026",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/auth/sign-out/actions", () => ({
  signOutAction: vi.fn(),
}));

const links = [
  { href: "/games", label: "Games" },
  { href: "/communities", label: "Communities" },
];

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("SiteMobileNav", () => {
  it("opens a side drawer with site links over the page", () => {
    render(
      <SiteMobileNav links={links} account={{ status: "anonymous" }} />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(drawer).toBeTruthy();
    expect(within(drawer).getByRole("link", { name: "Games" })).toHaveAttribute(
      "href",
      "/games",
    );
    expect(
      within(drawer).getByRole("link", { name: "Communities" }),
    ).toHaveAttribute("href", "/communities");
    expect(
      within(drawer).getByRole("link", { name: "Sign in" }),
    ).toHaveAttribute(
      "href",
      "/auth/sign-in?next=%2Fgame-of-the-year%2F2026",
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes when Escape is pressed", () => {
    render(
      <SiteMobileNav links={links} account={{ status: "anonymous" }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});
