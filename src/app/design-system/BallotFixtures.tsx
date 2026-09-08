"use client";

import { useState } from "react";
import {
  CategoryVotesEditor,
  type CategoryVoteSelection,
} from "@/components/lists/CategoryVotesEditor";
import {
  CustomCategoryVotesEditor,
  type CustomCategoryVoteSelection,
} from "@/components/communities/CustomCategoryVotesEditor";
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
      description="Add awards from the dialog. Search and filter your picks on this page."
    />
  );
}

export function CustomCategoryVotesEditorFixture() {
  const [value, setValue] = useState<CustomCategoryVoteSelection[]>([
    {
      categoryId: "550e8400-e29b-41d4-a716-446655440010",
      gameId: null,
      entryId: "550e8400-e29b-41d4-a716-446655440011",
      title: "Clair Obscur: Expedition 33",
      subtitle: null,
      imageUrl: null,
      coverUrl: FIXTURE_COVER,
    },
  ]);

  return (
    <CustomCategoryVotesEditor
      year={2025}
      categories={[
        {
          id: "550e8400-e29b-41d4-a716-446655440010",
          editionId: "550e8400-e29b-41d4-a716-446655440099",
          name: "Best Combat",
          description: "The fight that felt the most alive.",
          imageUrl: null,
          answerType: "selected_games",
          eligibility: "current_year",
          sortOrder: 0,
          entries: [
            {
              id: "550e8400-e29b-41d4-a716-446655440011",
              title: "Clair Obscur: Expedition 33",
              description: null,
              imageUrl: null,
              gameId: "550e8400-e29b-41d4-a716-446655440012",
              gameTitle: "Clair Obscur: Expedition 33",
              gameSlug: "clair-obscur-expedition-33",
              coverUrl: FIXTURE_COVER,
              supportLinkUrl: null,
              supportLinkKind: null,
              sortOrder: 0,
              entrySource: "host",
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440013",
              title: "Hades II",
              description: null,
              imageUrl: null,
              gameId: "550e8400-e29b-41d4-a716-446655440014",
              gameTitle: "Hades II",
              gameSlug: "hades-ii",
              coverUrl: FIXTURE_COVER,
              supportLinkUrl: null,
              supportLinkKind: null,
              sortOrder: 1,
              entrySource: "host",
            },
          ],
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440020",
          editionId: "550e8400-e29b-41d4-a716-446655440099",
          name: "Performance of the Year",
          description: "A character or voice that stole the show.",
          imageUrl: null,
          answerType: "text_game",
          eligibility: "current_year",
          sortOrder: 1,
          entries: [
            {
              id: "550e8400-e29b-41d4-a716-446655440021",
              title: "Maelle",
              description: null,
              imageUrl: null,
              gameId: "550e8400-e29b-41d4-a716-446655440012",
              gameTitle: "Clair Obscur: Expedition 33",
              gameSlug: "clair-obscur-expedition-33",
              coverUrl: FIXTURE_COVER,
              supportLinkUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
              supportLinkKind: "youtube",
              sortOrder: 0,
              entrySource: "host",
            },
          ],
        },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}
