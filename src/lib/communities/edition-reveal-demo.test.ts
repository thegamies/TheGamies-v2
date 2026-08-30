import { describe, expect, it } from "vitest";
import {
  buildEditionRevealDemoStandings,
  EDITION_REVEAL_DEMO_COVER,
} from "./edition-reveal-demo";

describe("buildEditionRevealDemoStandings", () => {
  it("builds a GOTY board and top 10 with Game 1…", () => {
    const { topTen, gotyBoard, matrix, categoryComparison } =
      buildEditionRevealDemoStandings([]);
    expect(topTen).toHaveLength(10);
    expect(gotyBoard.length).toBeGreaterThanOrEqual(10);
    expect(topTen[0]).toMatchObject({
      rank: 1,
      place: 1,
      title: "Game 1",
      coverUrl: EDITION_REVEAL_DEMO_COVER,
    });
    expect(topTen[9]?.title).toBe("Game 10");
    expect(matrix.hasGames).toBe(true);
    expect(matrix.rows).toHaveLength(10);
    expect(matrix.voiceColumns).toHaveLength(2);
    expect(categoryComparison.hasGames).toBe(false);
  });

  it("builds comparison matrices with category awards", () => {
    const { matrix, categoryComparison } = buildEditionRevealDemoStandings([
      { id: "best-art", label: "Best Art", description: "Look" },
    ]);
    expect(matrix.hasGames).toBe(true);
    expect(categoryComparison.hasGames).toBe(true);
    expect(categoryComparison.rows[0]?.label).toBe("Best Art");
    expect(categoryComparison.rows[0]?.community[0]?.title).toBe("Game 1");
  });

  it("builds a podium per edition category", () => {
    const { categoryPodiums } = buildEditionRevealDemoStandings([
      { id: "best-art", label: "Best Art", description: "Look" },
      { id: "best-audio", label: "Best Audio", description: null },
    ]);
    expect(categoryPodiums).toHaveLength(2);
    expect(categoryPodiums[0]).toMatchObject({
      categoryId: "best-art",
      label: "Best Art",
    });
    expect(categoryPodiums[0]?.rows).toHaveLength(3);
    expect(categoryPodiums[0]?.rows.map((r) => r.title)).toEqual([
      "Game 1",
      "Game 2",
      "Game 3",
    ]);
    expect(categoryPodiums[1]?.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});
