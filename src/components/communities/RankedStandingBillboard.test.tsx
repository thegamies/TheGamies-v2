/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RankedStandingBillboard } from "./RankedStandingBillboard";

vi.mock("@/lib/next-link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
  }: {
    alt: string;
    src: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

afterEach(() => {
  cleanup();
});

describe("RankedStandingBillboard", () => {
  it("stacks tied places instead of one card per game", () => {
    render(
      <RankedStandingBillboard
        items={[
          {
            place: 1,
            gameId: "a",
            slug: "alpha",
            title: "Alpha",
            coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/a.jpg",
            points: 10,
          },
          {
            place: 1,
            gameId: "b",
            slug: "bravo",
            title: "Bravo",
            coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/b.jpg",
            points: 10,
          },
          {
            place: 3,
            gameId: "c",
            slug: "charlie",
            title: "Charlie",
            coverUrl: null,
            points: 4,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Tied games, showing Alpha/ }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Charlie/ })).toBeTruthy();
    // Two place columns — not one card per tied game.
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
