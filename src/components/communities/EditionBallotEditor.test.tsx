/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cardTouchLockClassName } from "@/components/lists/cardChrome";
import { EditionBallotEditor } from "./EditionBallotEditor";

vi.mock("@/app/communities/actions", () => ({
  saveEditionBallotAction: vi.fn(),
}));

vi.mock("@/hooks/useUnsavedChangesGuard", () => ({
  useUnsavedChangesGuard: () => ({
    allowLeave: vi.fn(),
    dialog: null,
  }),
}));

vi.mock("@/components/ui/GameSearchField", () => ({
  GameSearchField: () => <div />,
}));

vi.mock("@/components/lists/CategoryVotesEditor", () => ({
  CategoryVotesEditor: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("EditionBallotEditor drag chrome", () => {
  it("locks text selection on ballot rank cards like GOTY grid", () => {
    render(
      <EditionBallotEditor
        slug="test"
        year={2026}
        initialItems={[
          {
            gameId: "g1",
            igdbId: 1,
            slug: "expedition-33",
            title: "Clair Obscur: Expedition 33",
            year: 2026,
            coverUrl: null,
            rank: 1,
            blurb: "",
          },
        ]}
        initialCategoryVotes={[]}
        awardCategories={[]}
      />,
    );

    const handle = screen.getByRole("button", {
      name: "Hold to reorder Clair Obscur: Expedition 33",
    });
    expect(handle.className).toContain("select-none");
    for (const token of cardTouchLockClassName.split(" ")) {
      expect(handle.className).toContain(token);
    }
  });
});
