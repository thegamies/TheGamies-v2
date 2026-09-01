/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignInLink } from "./SignInLink";

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
  usePathname: () => "/games/mass-effect",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
});

describe("SignInLink", () => {
  it("returns to the current page and is nofollow", () => {
    render(<SignInLink />);
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toHaveAttribute(
      "href",
      "/auth/sign-in?next=%2Fgames%2Fmass-effect",
    );
    expect(link).toHaveAttribute("rel", "nofollow");
  });
});
