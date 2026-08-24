/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComparisonStripHeader } from "./ComparisonStripHeader";

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

describe("ComparisonStripHeader", () => {
  it("shows an initial for a host column without a photo", () => {
    render(
      <ComparisonStripHeader
        href="/ballot"
        person={{ displayName: "Ada", username: "ada", avatarUrl: null }}
      >
        Ada
      </ComparisonStripHeader>,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ada" })).toHaveAttribute(
      "href",
      "/ballot",
    );
  });

  it("keeps aggregate labels as text only", () => {
    render(<ComparisonStripHeader>Community</ComparisonStripHeader>);
    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.queryByText("C")).toBeNull();
  });
});
