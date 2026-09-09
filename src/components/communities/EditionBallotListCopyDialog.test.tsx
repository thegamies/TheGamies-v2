/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BallotListCopyPreview } from "@/lib/communities/ballot-list-copy";
import { EditionBallotListCopyDialog } from "./EditionBallotListCopyDialog";

afterEach(() => {
  cleanup();
});

const createPreview: BallotListCopyPreview = {
  year: 2026,
  listTitle: "2026 Game of the Year",
  createList: true,
  games: [
    {
      rank: 1,
      gameId: "g1",
      title: "Clair Obscur: Expedition 33",
      coverUrl: null,
    },
  ],
  categories: [
    {
      categoryId: "story",
      label: "Best Story",
      gameId: "g1",
      title: "Clair Obscur: Expedition 33",
      coverUrl: null,
    },
  ],
  existingGameCount: 0,
  extraGamesRemovedCount: 0,
  rankingChanges: [],
  categoryChanges: [],
};

const existingPreview: BallotListCopyPreview = {
  year: 2026,
  listTitle: "2026 Game of the Year",
  createList: false,
  games: [
    {
      rank: 1,
      gameId: "g2",
      title: "Hades II",
      coverUrl: null,
    },
  ],
  categories: [
    {
      categoryId: "art",
      label: "Best Art Direction",
      gameId: "g2",
      title: "Hades II",
      coverUrl: null,
    },
  ],
  existingGameCount: 10,
  extraGamesRemovedCount: 9,
  rankingChanges: [
    {
      rank: 1,
      current: {
        rank: 1,
        gameId: "old-1",
        title: "Old Number One",
        coverUrl: null,
      },
      next: {
        rank: 1,
        gameId: "g2",
        title: "Hades II",
        coverUrl: null,
      },
    },
  ],
  categoryChanges: [
    {
      categoryId: "story",
      label: "Best Story",
      current: {
        gameId: "old-story",
        title: "Old Story",
        coverUrl: null,
      },
      next: {
        gameId: "g1",
        title: "Clair Obscur: Expedition 33",
        coverUrl: null,
      },
    },
  ],
};

describe("EditionBallotListCopyDialog", () => {
  it("lists the new GOTY ranking and missing award picks", () => {
    render(
      <EditionBallotListCopyDialog
        preview={createPreview}
        pending={false}
        error={null}
        onDismiss={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(
      screen.getByText("Save these to your Game of the Year list?"),
    ).toBeTruthy();
    expect(screen.getByText("2026 Game of the Year")).toBeTruthy();
    expect(screen.getByText("Best Story")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add to my list" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Not now" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "List visibility" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ranked" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Games only" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hidden" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Export mode" })).toBeNull();
  });

  it("hides the ranking when the list already exists", () => {
    render(
      <EditionBallotListCopyDialog
        preview={existingPreview}
        pending={false}
        error={null}
        onDismiss={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(screen.queryByText("New list for the site rankings.")).toBeNull();
    expect(screen.queryByRole("group", { name: "List visibility" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Export mode" })).toBeNull();
    expect(screen.getByText("Best Art Direction")).toBeTruthy();
    expect(screen.getAllByText("Hades II").length).toBeGreaterThan(0);
  });

  it("names ranks and awards replace would overwrite", () => {
    const onConfirm = vi.fn();
    render(
      <EditionBallotListCopyDialog
        preview={existingPreview}
        pending={false}
        error={null}
        source="manual"
        onDismiss={() => {}}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByText("Export to your Game of the Year list?"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Replace list" }));
    expect(screen.getByText("What will be overwritten")).toBeTruthy();
    expect(
      screen.getByText(
        "Your list has 10 games. Replace will set it to this ballot’s ranking and remove 9 extra games.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getByText("Old Number One → Hades II")).toBeTruthy();
    expect(screen.getByText("Old Story → Clair Obscur: Expedition 33")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Replace my list" }));
    expect(onConfirm).toHaveBeenCalledWith({
      rankVisibility: undefined,
      mode: "overwrite",
    });
  });
});
