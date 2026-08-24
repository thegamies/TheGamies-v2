/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonIdentity } from "./PersonIdentity";

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
});

describe("PersonIdentity", () => {
  it("falls back to an initial when there is no photo", () => {
    render(
      <PersonIdentity displayName="Eric" username="eric4" avatarUrl={null} />,
    );
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("Eric")).toBeInTheDocument();
    expect(screen.getByText("@eric4")).toBeInTheDocument();
  });

  it("links the name when href is set", () => {
    render(
      <PersonIdentity
        displayName="Eric"
        username="eric4"
        href="/u/eric4"
      />,
    );
    expect(screen.getByRole("link", { name: "Eric" })).toHaveAttribute(
      "href",
      "/u/eric4",
    );
  });
});
