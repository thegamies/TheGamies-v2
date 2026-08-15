"use client";

import { useState } from "react";
import {
  StandingGameCard,
  type RankScoreLayout,
} from "@/components/communities/StandingGameCard";
import { RadioOption } from "@/components/ui/Radio";

const FIXTURE_COVER =
  "https://images.igdb.com/igdb/image/upload/t_cover_big/co9wvg.jpg";

const LAYOUTS: {
  value: RankScoreLayout;
  label: string;
  hint: string;
}[] = [
  {
    value: "votes-under-title",
    label: "Votes under title (shipped)",
    hint: "Rank in front of the title. Votes hug the last line — no reserved 2-line block.",
  },
  {
    value: "overhead",
    label: "Above",
    hint: "Rank left, votes right, above the cover. Former default gap.",
  },
  {
    value: "overhead-tight",
    label: "Above, tight",
    hint: "Same pair above the cover, with less space down to the art.",
  },
  {
    value: "below-cover",
    label: "Below cover",
    hint: "Rank + votes under the art; title under that row. Tight to the cover.",
  },
];

const GAMES = [
  { place: 1, slug: "fixture-1", title: "Hades II", points: 48 },
  { place: 2, slug: "fixture-2", title: "Clair Obscur: Expedition 33", points: 41 },
  { place: 3, slug: "fixture-3", title: "Split Fiction", points: 33 },
  { place: 4, slug: "fixture-4", title: "Doom: The Dark Ages — Revelations", points: 12 },
  { place: 5, slug: "fixture-5", title: "Kingdom Come: Deliverance II", points: 9 },
  { place: 6, slug: "fixture-6", title: "Mario Kart World", points: 8 },
  { place: 7, slug: "fixture-7", title: "Blue Prince", points: 6 },
  {
    place: 8,
    slug: "fixture-8",
    title: "The Legend of Zelda: Tears of the Kingdom",
    points: 1,
  },
] as const;

export function StandingCardLayoutFixture() {
  const [layout, setLayout] = useState<RankScoreLayout>("votes-under-title");
  const [showYear, setShowYear] = useState(true);

  return (
    <div>
      <fieldset className="max-w-xl space-y-3">
        <legend className="mb-3 text-sm font-medium tracking-wide text-muted">
          Rank, votes, and title
        </legend>
        {LAYOUTS.map((option) => (
          <RadioOption
            key={option.value}
            name="design-system-rank-score-layout"
            value={option.value}
            checked={layout === option.value}
            onChange={() => setLayout(option.value)}
            hint={option.hint}
          >
            {option.label}
          </RadioOption>
        ))}
      </fieldset>
      <fieldset className="mt-8 max-w-xl space-y-3">
        <legend className="mb-3 text-sm font-medium tracking-wide text-muted">
          Year
        </legend>
        <RadioOption
          name="design-system-rank-score-year"
          value="shown"
          checked={showYear}
          onChange={() => setShowYear(true)}
          hint="Release year under the title (or on the votes line)."
        >
          Shown
        </RadioOption>
        <RadioOption
          name="design-system-rank-score-year"
          value="hidden"
          checked={!showYear}
          onChange={() => setShowYear(false)}
          hint="Title and votes only — no year line."
        >
          Hidden
        </RadioOption>
      </fieldset>
      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {GAMES.map((game) => (
          <li key={game.slug}>
            <StandingGameCard
              place={game.place}
              slug={game.slug}
              title={game.title}
              coverUrl={FIXTURE_COVER}
              year={showYear ? 2026 : null}
              points={game.points}
              scoreUnit="votes"
              rankScoreLayout={layout}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
