"use client";

import { useState } from "react";
import {
  CategoryVotesEditor,
  type CategoryVoteSelection,
} from "@/components/lists/CategoryVotesEditor";
import { GameSearchField } from "@/components/ui/GameSearchField";

const FIXTURE_COVER =
  "https://images.igdb.com/igdb/image/upload/t_cover_big/co9wvg.jpg";

export function GameSearchFieldFixture() {
  return (
    <GameSearchField
      year={2026}
      onSelect={() => {}}
      aria-label="Search 2026 games"
    />
  );
}

export function CategoryVotesEditorFixture() {
  const [value, setValue] = useState<CategoryVoteSelection[]>([
    {
      categoryId: "narrative",
      gameId: "11111111-1111-4111-8111-111111111111",
      title: "Super Battle Golf",
      coverUrl: FIXTURE_COVER,
    },
  ]);

  return (
    <CategoryVotesEditor
      year={2026}
      categories={[
        {
          id: "narrative",
          label: "Best Story",
          description: "The story you couldn't stop thinking about.",
          sortOrder: 3,
          categoryGroup: "premier",
          eligibility: "current_year",
        },
        {
          id: "best-multiplayer",
          label: "Best Multiplayer",
          description: null,
          sortOrder: 8,
          categoryGroup: "major",
          eligibility: "current_or_active",
        },
        {
          id: "best-rpg",
          label: "Best RPG",
          description: null,
          sortOrder: 11,
          categoryGroup: "genre",
          eligibility: "current_year",
        },
      ]}
      value={value}
      onChange={setValue}
      description="Choose awards from the grid. Search filters the catalog."
    />
  );
}
