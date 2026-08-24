/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteAccountMenu } from "./SiteAccountMenu";
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

vi.mock("@/app/auth/sign-out/actions", () => ({
  signOutAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("SiteAccountMenu", () => {
  it("opens with profile, settings, and ops links", () => {
    render(
      <SiteAccountMenu
        label="ecdm98"
        username="ecdm98"
        groups={buildAccountMenuGroups({
          username: "ecdm98",
          includeAdmin: true,
          includeDesignSystem: true,
        })}
      />,
    );

    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ecdm98" }));

    const menu = screen.getByRole("menu", { name: "Account" });
    expect(menu).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "View Profile" })).toHaveAttribute(
      "href",
      "/u/ecdm98",
    );
    expect(screen.getByRole("menuitem", { name: "My Lists" })).toHaveAttribute(
      "href",
      "/u/ecdm98",
    );
    expect(
      screen.getByRole("menuitem", { name: "My Communities" }),
    ).toHaveAttribute("href", "/u/ecdm98?tab=communities");
    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(screen.getByRole("menuitem", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      screen.getByRole("menuitem", { name: "Design system" }),
    ).toHaveAttribute("href", "/design-system");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
  });

  it("hides Design system when the group omits it", () => {
    render(
      <SiteAccountMenu
        label="ecdm98"
        username="ecdm98"
        groups={buildAccountMenuGroups({
          username: "ecdm98",
          includeAdmin: true,
          includeDesignSystem: false,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ecdm98" }));
    expect(screen.getByRole("menuitem", { name: "Admin" })).toBeTruthy();
    expect(
      screen.queryByRole("menuitem", { name: "Design system" }),
    ).toBeNull();
  });

  it("closes when Escape is pressed", () => {
    render(
      <SiteAccountMenu
        label="ecdm98"
        username="ecdm98"
        groups={buildAccountMenuGroups({
          username: "ecdm98",
          includeDesignSystem: false,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ecdm98" }));
    expect(screen.getByRole("menu")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
