/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteBrand } from "./SiteBrand";

const { pathname } = vi.hoisted(() => ({
  pathname: vi.fn(() => "/"),
}));

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
  usePathname: () => pathname(),
}));

afterEach(() => {
  cleanup();
  pathname.mockReturnValue("/");
});

describe("SiteBrand", () => {
  it("uses a larger display size on the homepage", () => {
    pathname.mockReturnValue("/");
    render(<SiteBrand />);
    expect(screen.getByRole("link", { name: "The Gamies" })).toHaveClass(
      "text-5xl",
      "sm:text-6xl",
    );
  });

  it("keeps the compact mark on inner pages", () => {
    pathname.mockReturnValue("/games");
    render(<SiteBrand />);
    const mark = screen.getByRole("link", { name: "The Gamies" });
    expect(mark).toHaveClass("text-3xl");
    expect(mark).not.toHaveClass("text-5xl");
  });
});
