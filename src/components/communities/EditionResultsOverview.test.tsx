/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditionResultsBoardToolbar } from "./EditionResultsBoardToolbar";
import { EditionResultsLayoutProvider } from "./EditionResultsLayout";
import { EditionResultsOverview } from "./EditionResultsOverview";

const emptyMatrix = {
  showYou: false,
  hasGames: false,
  voiceColumns: [],
  rows: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("EditionResultsOverview comparison", () => {
  it("fetches comparison when the toolbar selects Comparison", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matrix: emptyMatrix,
        categoryComparison: emptyMatrix,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EditionResultsLayoutProvider>
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
      </EditionResultsLayoutProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Comparison" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/communities/eric/edition/2026/comparison",
      );
    });
  });
});
