/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dist/client/app-dir/link", () => ({
  default: ({
    href,
    prefetch,
    children,
  }: {
    href: string;
    prefetch?: boolean | "auto" | null;
    children: React.ReactNode;
  }) => (
    <a href={href} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

import Link from "./next-link";

afterEach(() => {
  cleanup();
});

describe("next-link", () => {
  it("defaults prefetch to false", () => {
    render(<Link href="/games">Games</Link>);
    expect(screen.getByRole("link", { name: "Games" })).toHaveAttribute(
      "data-prefetch",
      "false",
    );
  });

  it("still allows an explicit prefetch opt-in", () => {
    render(
      <Link href="/about" prefetch>
        About
      </Link>,
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "data-prefetch",
      "true",
    );
  });
});
