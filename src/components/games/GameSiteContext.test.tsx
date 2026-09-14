/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameSiteContext } from "./GameSiteContext";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe("GameSiteContext", () => {
  it("explains the site rank and links methodology", () => {
    render(
      <GameSiteContext
        title="Clair Obscur: Expedition 33"
        rankings={{
          byYear: [
            {
              year: 2025,
              rank: 1,
              votes: 16,
              score: 108,
              votesByRank: null,
              detailedStatsRevealed: true,
            },
          ],
          viaParent: null,
        }}
        lists={[
          {
            href: "/u/ada/goty-2025",
            title: "Ada's 2025 list",
            ownerName: "Ada",
            rank: 1,
            year: 2025,
          },
        ]}
      />,
    );

    expect(screen.getByText(/rank 1 on the/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "How rankings work" }).getAttribute(
        "href",
      ),
    ).toBe("/rankings");
    expect(screen.queryByRole("link", { name: "2025 recap" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Ada's 2025 list" }).getAttribute(
        "href",
      ),
    ).toBe("/u/ada/goty-2025");
  });

  it("renders nothing without ranks or lists", () => {
    const { container } = render(
      <GameSiteContext
        title="Obscure Title"
        rankings={{ byYear: [], viaParent: null }}
        lists={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
