/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GameGotyRankings, GameGotyRankingsGallery } from "./GameGotyRankings";

afterEach(() => {
  cleanup();
});

describe("GameGotyRankings", () => {
  it("renders a standings line with rank, votes, points, and the year link", () => {
    render(
      <GameGotyRankings
        stats={{
          byYear: [
            {
              year: 2026,
              rank: 4,
              votes: 12,
              score: 86,
              votesByRank: [5, 3, 2, 1, 1, 0, 0, 0, 0, 0],
              detailedStatsRevealed: true,
            },
          ],
          viaParent: null,
        }}
      />,
    );
    expect(screen.getByLabelText("Rank 4")).toBeTruthy();
    expect(screen.getByText("12 votes · 86 pts")).toBeTruthy();
    expect(screen.getByText("By list position")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "2026 Game of the Year" }),
    ).toBeTruthy();
  });

  it("hides vote totals until the year is revealed", () => {
    render(
      <GameGotyRankings
        stats={{
          byYear: [
            {
              year: 2026,
              rank: 2,
              votes: null,
              score: null,
              votesByRank: null,
              detailedStatsRevealed: false,
            },
          ],
          viaParent: null,
        }}
      />,
    );
    expect(screen.getByLabelText("Rank 2")).toBeTruthy();
    expect(screen.queryByText("By list position")).toBeNull();
    expect(
      screen.getByText(
        "Vote totals and points appear when that year’s results are revealed.",
      ),
    ).toBeTruthy();
  });

  it("renders nothing when the game is unranked", () => {
    const { container } = render(
      <GameGotyRankings stats={{ byYear: [], viaParent: null }} />,
    );
    expect(container.textContent).toBe("");
  });

  it("names the parent title when standings are inherited", () => {
    render(
      <GameGotyRankings
        stats={{
          byYear: [
            {
              year: 2026,
              rank: 1,
              votes: 4,
              score: 40,
              votesByRank: [4, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              detailedStatsRevealed: true,
            },
          ],
          viaParent: { slug: "elden-ring", title: "Elden Ring" },
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "Elden Ring" })).toBeTruthy();
  });

  it("renders the broadcast board with rank, points, voters, and chart", () => {
    render(
      <GameGotyRankings
        layout="broadcast"
        stats={{
          byYear: [
            {
              year: 2026,
              rank: 1,
              votes: 109,
              score: 645,
              votesByRank: [16, 11, 12, 8, 12, 14, 6, 14, 10, 6],
              detailedStatsRevealed: true,
            },
          ],
          viaParent: null,
        }}
      />,
    );
    expect(screen.getByLabelText("Rank 1")).toBeTruthy();
    expect(screen.queryByText("Crimson Desert")).toBeNull();
    expect(screen.getByText("Current ranking")).toBeTruthy();
    expect(screen.getByText("645")).toBeTruthy();
    expect(screen.getByText("Points")).toBeTruthy();
    expect(screen.getByText("109")).toBeTruthy();
    expect(screen.getByText("Voters")).toBeTruthy();
    expect(screen.getByText("Votes by list position")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "2026 Game of the Year" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: "View 2026 GOTY standings →" }),
    ).toBeNull();
  });

  it("fits the broadcast board without the axis caption", () => {
    render(
      <GameGotyRankings
        layout="broadcast-compact"
        fit
        stats={{
          byYear: [
            {
              year: 2026,
              rank: 1,
              votes: 109,
              score: 645,
              votesByRank: [16, 11, 12, 8, 12, 14, 6, 14, 10, 6],
              detailedStatsRevealed: true,
            },
          ],
          viaParent: null,
        }}
      />,
    );
    expect(screen.getByLabelText("Rank 1")).toBeTruthy();
    expect(screen.queryByText("Number of votes")).toBeNull();
  });
});

describe("GameGotyRankingsGallery", () => {
  it("labels the current layout and the alternatives", () => {
    render(
      <GameGotyRankingsGallery
        stats={{
          byYear: [
            {
              year: 2026,
              rank: 4,
              votes: 12,
              score: 86,
              votesByRank: [5, 3, 2, 1, 1, 0, 0, 0, 0, 0],
              detailedStatsRevealed: true,
            },
          ],
          viaParent: null,
        }}
      />,
    );
    expect(screen.getByText("Standings line")).toBeTruthy();
    expect(screen.getByText("Masthead")).toBeTruthy();
    expect(screen.getByText("Folio")).toBeTruthy();
    expect(screen.getByText("Scoreboard")).toBeTruthy();
    expect(screen.getByText("Lede")).toBeTruthy();
    expect(screen.getByText("Chapter")).toBeTruthy();
    expect(screen.getByText("Classic")).toBeTruthy();
    expect(screen.getByText("Old The Gamies")).toBeTruthy();
    expect(screen.getByText("Broadcast")).toBeTruthy();
    expect(screen.getByText("Broadcast compact · current")).toBeTruthy();
  });
});
