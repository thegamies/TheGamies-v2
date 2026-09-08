/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeBigPictureBanner } from "./HomeBigPictureBanner";

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

const games = [
  {
    gameId: "1",
    slug: "ghost-of-yotei",
    title: "Ghost of Yōtei",
    coverUrl: "https://cdn.example/yotei.jpg",
  },
  {
    gameId: "2",
    slug: "clair-obscur",
    title: "Clair Obscur",
    coverUrl: "https://cdn.example/clair.jpg",
  },
  {
    gameId: "3",
    slug: "hades-ii",
    title: "Hades II",
    coverUrl: "https://cdn.example/hades.jpg",
  },
  {
    gameId: "4",
    slug: "split-fiction",
    title: "Split Fiction",
    coverUrl: "https://cdn.example/split.jpg",
  },
];

describe("HomeBigPictureBanner", () => {
  it("keeps marquee covers decorative and does not link them to game pages", () => {
    render(<HomeBigPictureBanner games={games} />);

    expect(
      document.querySelector('a[href="/games/ghost-of-yotei"]'),
    ).toBeNull();
    expect(document.querySelectorAll('a[href^="/games/"]').length).toBe(0);
    expect(screen.getByRole("link", { name: "Browse games" })).toHaveAttribute(
      "href",
      "/games",
    );
    expect(screen.getByRole("link", { name: "Communities" })).toHaveAttribute(
      "href",
      "/communities",
    );
  });
});
