/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  it("offers image and link actions without calling share by itself", () => {
    const onShareAsImage = vi.fn();
    const onShareWithLink = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <ShareMenuDialog
        open
        onClose={onClose}
        onShareAsImage={onShareAsImage}
        onShareWithLink={onShareWithLink}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Share" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Share as image" }));
    expect(onShareAsImage).toHaveBeenCalledTimes(1);
    expect(onShareWithLink).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    onClose.mockClear();
    onShareAsImage.mockClear();

    rerender(
      <ShareMenuDialog
        open
        onClose={onClose}
        onShareAsImage={onShareAsImage}
        onShareWithLink={onShareWithLink}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Share with a link" }),
    );
    expect(onShareWithLink).toHaveBeenCalledTimes(1);
    expect(onShareAsImage).not.toHaveBeenCalled();
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
    expect(link.getAttribute("href")).toContain(
      encodeURIComponent("/create/goty?year=2026&intent=save"),
    );
    expect(screen.getByRole("button", { name: "Keep editing" })).toBeTruthy();
  });
});

describe("ShareLinkSignInDialog", () => {
  it("links Sign in & share and can fall back to image", () => {
    const onShareAsImage = vi.fn();
    const onClose = vi.fn();

    render(
      <ShareLinkSignInDialog
        open
        onClose={onClose}
        onShareAsImage={onShareAsImage}
        returnPath="/create/custom?title=Favs"
      />,
    );

    const link = screen.getByRole("link", { name: /Sign in & share/i });
    expect(link.getAttribute("href")).toContain("intent=share");
    expect(link.getAttribute("href")).toContain(
      encodeURIComponent("/create/custom?title=Favs&intent=share"),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Share as image instead" }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(onShareAsImage).toHaveBeenCalledTimes(1);
  });
});
