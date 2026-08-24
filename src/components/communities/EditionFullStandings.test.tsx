/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EditionFullStandings } from "./EditionFullStandings";
import type { EditionGotyStandingRow } from "@/lib/communities/edition-results";

afterEach(() => {
  cleanup();
});

const row: EditionGotyStandingRow = {
  place: 1,
  rank: 1,
  gameId: "g1",
  slug: "clair-obscur",
  title: "Clair Obscur",
  year: 2025,
  coverUrl: null,
  points: 40,
  firstPlaceVotes: 4,
  appearances: 8,
};

describe("EditionFullStandings", () => {
  it("paginates with Previous and Next links", () => {
    render(
      <EditionFullStandings
        slug="kindafunny"
        year={2026}
        mode="community"
        page={2}
        pageSize={50}
        total={80}
        totalPages={2}
        rows={[row]}
      />,
    );

    expect(screen.getByText("51–80 of 80 · page 2 of 2")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Previous" }).getAttribute("href"),
    ).toBe("/communities/kindafunny/edition/2026?view=standings");
    expect(screen.queryByRole("link", { name: "Next" })).toBeNull();
    expect(screen.getByText("Next")).toBeTruthy();
  });

  it("hides page links on a host preview slice", () => {
    render(
      <EditionFullStandings
        slug="kindafunny"
        year={2026}
        mode="community"
        page={1}
        pageSize={12}
        total={80}
        totalPages={1}
        rows={[row]}
        paginate={false}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "Full standings pages" })).toBeNull();
    expect(
      screen.getByText(/The full board opens when results publish/),
    ).toBeTruthy();
  });
});
