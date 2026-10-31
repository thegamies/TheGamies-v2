/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromoBanner } from "./PromoBanner";

vi.mock("@/lib/next-link", () => ({
  default: ({
    children,
    href,
    className,
    "aria-label": ariaLabel,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("PromoBanner", () => {
  it("makes the whole banner one link without a brush underline", () => {
    const { container } = render(
      <PromoBanner
        kind="tga"
        year={2025}
        href="/the-game-awards/2025"
        status="open"
        live={false}
        accent="Picks are open."
        rest="Lock your calls before the show."
        cta="Make your picks"
      />,
    );

    const link = screen.getByRole("link", {
      name: /Make your picks/i,
    });
    expect(link).toHaveAttribute("href", "/the-game-awards/2025");
    expect(link).toHaveClass("promo-banner__hit");
    expect(container.querySelector(".promo-banner__brush")).toBeNull();
    expect(container.querySelector(".promo-banner__meta")).toBeNull();
    expect(
      screen.getByText(/Make your picks/i).closest(".promo-banner__aside"),
    ).not.toBeNull();
  });
});
