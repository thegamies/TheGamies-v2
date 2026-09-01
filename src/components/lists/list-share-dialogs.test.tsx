/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaveSignInDialog } from "./SaveSignInDialog";
import { ShareLinkSignInDialog } from "./ShareLinkSignInDialog";
import { ShareMenuDialog } from "./ShareMenuDialog";

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
  document.body.style.overflow = "";
});

describe("ShareMenuDialog", () => {
  it("offers image and link actions from the share button menu", () => {
    const onShareAsImage = vi.fn();
    const onShareWithLink = vi.fn();

    render(
      <div className="relative">
        <ShareMenuDialog
          open
          signedIn
          onShareAsImage={onShareAsImage}
          onShareWithLink={onShareWithLink}
        />
      </div>,
    );

    const menu = screen.getByRole("menu", { name: "Share" });
    fireEvent.click(screen.getByRole("menuitem", { name: "Share as image" }));
    expect(onShareAsImage).toHaveBeenCalledTimes(1);
    expect(onShareWithLink).not.toHaveBeenCalled();
    expect(menu).toBeTruthy();
  });

  it("marks share with a link as sign-in required when signed out", () => {
    render(
      <ShareMenuDialog
        open
        signedIn={false}
        onShareAsImage={() => undefined}
        onShareWithLink={() => undefined}
      />,
    );

    expect(screen.getByText("Sign in required")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Share with a link/i })).toBeTruthy();
  });
});

describe("SaveSignInDialog", () => {
  it("links Sign in & save with intent=save", () => {
    render(
      <SaveSignInDialog
        open
        onClose={() => undefined}
        returnPath="/create/goty?year=2026"
      />,
    );

    const link = screen.getByRole("link", { name: /Sign in & save/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("/auth/sign-in?"),
    );
    expect(link.getAttribute("href")).toContain("intent=save");
    expect(link).toHaveAttribute("rel", "nofollow");
    expect(link.getAttribute("href")).toContain(
      encodeURIComponent("/create/goty?year=2026&intent=save"),
    );
    expect(screen.queryByRole("button", { name: "Keep editing" })).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    const createLink = screen.getByRole("link", {
      name: /Create account & save/i,
    });
    expect(createLink.getAttribute("href")).toContain("/auth/sign-up?");
    expect(createLink.getAttribute("href")).toContain("intent=save");
    expect(createLink).toHaveAttribute("rel", "nofollow");
  });
});

describe("ShareLinkSignInDialog", () => {
  it("only offers sign in or create account", () => {
    render(
      <ShareLinkSignInDialog
        open
        onClose={() => undefined}
        returnPath="/create/custom?title=Favs"
      />,
    );

    const link = screen.getByRole("link", { name: /Sign in & share/i });
    expect(link.getAttribute("href")).toContain("intent=share");
    expect(link).toHaveAttribute("rel", "nofollow");
    expect(link.getAttribute("href")).toContain(
      encodeURIComponent("/create/custom?title=Favs&intent=share"),
    );
    expect(screen.queryByRole("button", { name: "Share as image instead" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });
});
