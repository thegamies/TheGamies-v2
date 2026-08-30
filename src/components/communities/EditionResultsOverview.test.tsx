/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EditionResultsBoardToolbar } from "./EditionResultsBoardToolbar";
import { EditionResultsOverview } from "./EditionResultsOverview";

const emptyMatrix = {
  showYou: false,
  hasGames: false,
  voiceColumns: [],
  rows: [],
};

afterEach(() => {
  cleanup();
});

describe("EditionResultsOverview comparison", () => {
  it("renders Ranked and Comparison as Results layout links", () => {
    render(
      <>
        <EditionResultsBoardToolbar
          slug="eric"
          year={2026}
          mode="community"
          view="overview"
          showLayout
        />
        <EditionResultsOverview
          slug="eric"
          year={2026}
          layout="ranked"
          topTen={[
            {
              place: 1,
              rank: 1,
              gameId: "g1",
              slug: "game",
              title: "Game",
              year: 2026,
              coverUrl: null,
              points: 10,
              firstPlaceVotes: 1,
              appearances: 1,
            },
          ]}
          matrix={emptyMatrix}
          gotyTotal={1}
          standingsHref="/communities/eric/edition/2026?view=standings"
          categoryPodiums={[]}
          categoryComparison={emptyMatrix}
          youBallotHref={null}
        />
      </>,
    );

    expect(screen.getByRole("link", { name: "Ranked" }).getAttribute("href")).toBe(
      "/communities/eric/edition/2026?view=results",
    );
    expect(
      screen.getByRole("link", { name: "Comparison" }).getAttribute("href"),
    ).toBe("/communities/eric/edition/2026?view=comparison");
  });

  it("hides Community and Hosts on the Comparison route", () => {
    render(
      <EditionResultsBoardToolbar
        slug="eric"
        year={2026}
        mode="community"
        view="comparison"
        showLayout
      />,
    );

    expect(screen.getByRole("link", { name: "Comparison" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Results board" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Community" })).toBeNull();
  });
});
