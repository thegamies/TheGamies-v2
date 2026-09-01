/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteMobileNav } from "./SiteMobileNav";
import { buildAccountMenuGroups } from "@/lib/site-nav";

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

const primaryLinks = [
  { href: "/games", label: "Games" },
  { href: "/game-of-the-year", label: "GOTY" },
  { href: "/communities", label: "Communities" },
];

const utilityLinks = [{ href: "/design-system", label: "Design system" }];

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("SiteMobileNav", () => {
  it("opens a side drawer with site links over the page", () => {
    render(
      <SiteMobileNav
        primaryLinks={primaryLinks}
        utilityLinks={utilityLinks}
        account={{ status: "anonymous" }}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(drawer).toBeTruthy();
    expect(within(drawer).getByRole("link", { name: "Games" })).toHaveAttribute(
      "href",
      "/games",
    );
    expect(within(drawer).getByRole("link", { name: "GOTY" })).toHaveAttribute(
      "href",
      "/game-of-the-year",
    );
    expect(
      within(drawer).getByRole("link", { name: "Communities" }),
    ).toHaveAttribute("href", "/communities");
    expect(
      within(drawer).getByRole("link", { name: "+ Create" }),
    ).toHaveAttribute("href", "/create");
    expect(
      within(drawer).getByRole("link", { name: "Sign in" }),
    ).toHaveAttribute(
      "href",
      "/auth/sign-in?next=%2Fgame-of-the-year%2F2026",
    );
    expect(
      within(drawer).getByRole("link", { name: "Sign in" }),
    ).toHaveAttribute("rel", "nofollow");
    expect(
      within(drawer).getByRole("link", { name: "Design system" }),
    ).toHaveAttribute("href", "/design-system");
    expect(within(drawer).queryByRole("link", { name: "Admin" })).toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("lists signed-in account destinations in the drawer", () => {
    render(
      <SiteMobileNav
        primaryLinks={primaryLinks}
        utilityLinks={utilityLinks}
        account={{
          status: "authenticated",
          label: "ecdm98",
          username: "ecdm98",
          avatarUrl: null,
          groups: buildAccountMenuGroups({
            username: "ecdm98",
            includeAdmin: true,
            includeDesignSystem: true,
          }),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = screen.getByRole("dialog", { name: "Menu" });

    expect(
      within(drawer).getByRole("link", { name: "View Profile" }),
    ).toHaveAttribute("href", "/u/ecdm98");
    expect(
      within(drawer).getByRole("link", { name: "My Lists" }),
    ).toHaveAttribute("href", "/u/ecdm98");
    expect(
      within(drawer).getByRole("link", { name: "My Communities" }),
    ).toHaveAttribute("href", "/u/ecdm98?tab=communities");
    expect(
      within(drawer).getByRole("link", { name: "Settings" }),
    ).toHaveAttribute("href", "/account");
    expect(within(drawer).getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("closes when Escape is pressed", () => {
    render(
      <SiteMobileNav
        primaryLinks={primaryLinks}
        utilityLinks={utilityLinks}
        account={{ status: "anonymous" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});
