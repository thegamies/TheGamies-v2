/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditionBallotPreview } from "./EditionBallotPreview";
import type { CustomCategoryView } from "@/lib/communities/custom-category-types";

vi.mock("@/app/communities/actions", () => ({
  setCommunityEditionCategoriesAction: vi.fn(),
  createCustomCategoryAction: vi.fn(),
  updateCustomCategoryAction: vi.fn(),
  deleteCustomCategoryAction: vi.fn(),
  createCustomCategoryEntryAction: vi.fn(),
  updateCustomCategoryEntryAction: vi.fn(),
  deleteCustomCategoryEntryAction: vi.fn(),
  reorderCustomCategoryEntriesAction: vi.fn(),
  uploadCustomCategoryImageAction: vi.fn(),
  uploadCustomCategoryEntryImageAction: vi.fn(),
}));

vi.mock("@/hooks/useUnsavedChangesGuard", () => ({
  useUnsavedChangesGuard: () => ({
    allowLeave: vi.fn(),
    dialog: null,
  }),
}));

afterEach(() => {
  cleanup();
});

function custom(
  partial: Partial<CustomCategoryView> & Pick<CustomCategoryView, "id" | "name">,
): CustomCategoryView {
  return {
    editionId: "ed",
    description: "A community award.",
    imageUrl: null,
    answerType: "any_game",
    eligibility: "current_year",
    sortOrder: 1,
    entries: [],
    ...partial,
  };
}

describe("EditionBallotPreview", () => {
  it("shows host-only copy and the GOTY chapter", () => {
    render(
      <EditionBallotPreview slug="crew" year={2026} categories={[]} />,
    );
    expect(
      screen.getByText(
        /Host preview\. Members won’t see this ballot until voting opens\./,
      ),
    ).toBeTruthy();
    expect(screen.getByText("Game of the Year")).toBeTruthy();
    expect(
      screen.getByText("Members will rank up to 10 games from 2026."),
    ).toBeTruthy();
    expect(screen.getByText("Award picks")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add category" })).toBeTruthy();
  });

  it("lists site and community awards so hosts can reorder them", () => {
    render(
      <EditionBallotPreview
        slug="crew"
        year={2026}
        categories={[
          {
            id: "story",
            label: "Best Story",
            description: "The story you couldn’t stop thinking about.",
            sortOrder: 0,
          },
        ]}
        customCategories={[
          custom({
            id: "community-pick",
            name: "Community Pick",
            sortOrder: 1,
          }),
        ]}
        siteCategoryCatalog={[
          {
            id: "story",
            label: "Best Story",
            description: "The story you couldn’t stop thinking about.",
            sortOrder: 0,
            categoryGroup: "premier",
            eligibility: "current_year",
          },
        ]}
      />,
    );
    expect(screen.getByText("Best Story")).toBeTruthy();
    expect(screen.getByText("Community Pick")).toBeTruthy();
    expect(screen.getByText("Community")).toBeTruthy();
    const labels = screen.getAllByRole("heading", { level: 3 }).map((el) =>
      el.textContent,
    );
    expect(labels).toEqual(["Best Story", "Community Pick"]);
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add category" })).toBeTruthy();
  });
});
