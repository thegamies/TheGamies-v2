/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditionBallotReadonly } from "./EditionBallotReadonly";

vi.mock("@/app/communities/actions", () => ({
  copyEditionBallotToGotyAction: vi.fn(),
  previewEditionBallotListExportAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const items = [
  {
    gameId: "g1",
    slug: "expedition-33",
    title: "Clair Obscur: Expedition 33",
    coverUrl: null,
    rank: 1,
  },
];

describe("EditionBallotReadonly export", () => {
  it("offers export on your ballot", () => {
    render(
      <EditionBallotReadonly
        items={items}
        categoryVotes={[]}
        categories={[]}
        emptyMessage="You did not submit a ballot for this event."
        exportToList={{ slug: "test", year: 2026 }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Export to my list" }),
    ).toBeTruthy();
  });

  it("hides export on another voter’s ballot", () => {
    render(
      <EditionBallotReadonly
        items={items}
        categoryVotes={[]}
        categories={[]}
        emptyMessage="This voter did not submit a ballot for this edition."
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Export to my list" }),
    ).toBeNull();
  });
});
