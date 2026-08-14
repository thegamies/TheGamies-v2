"use client";

import { useState } from "react";
import { EditionCategoriesHighlights } from "@/components/communities/EditionCategoriesHighlights";
import { EditionGotyHighlights } from "@/components/communities/EditionGotyHighlights";
import { navItemClass } from "@/components/ui/navLevels";
import type {
  EditionBallotMatrix,
  EditionCategoryComparisonMatrix,
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
} from "@/lib/communities/edition-results";

export type ResultsBoardLayout = "ranked" | "comparison";

const LAYOUTS: Array<{ id: ResultsBoardLayout; label: string }> = [
  { id: "ranked", label: "Ranked" },
  { id: "comparison", label: "Comparison" },
];

export function EditionResultsOverview({
  slug,
  year,
  topTen,
  matrix,
  gotyTotal,
  standingsHref,
  categoriesHref,
  categoryPodiums,
  categoryComparison,
  youBallotHref,
}: {
  slug: string;
  year: number;
  topTen: EditionGotyStandingRow[];
  matrix: EditionBallotMatrix;
  gotyTotal: number;
  standingsHref: string;
  categoriesHref: string;
  categoryPodiums: EditionCategoryStandingBlock[];
  categoryComparison: EditionCategoryComparisonMatrix;
  youBallotHref: string | null;
}) {
  const [layout, setLayout] = useState<ResultsBoardLayout>("ranked");
  const showCategories =
    categoryPodiums.length > 0 || categoryComparison.hasGames;
  const showGoty = topTen.length > 0 || matrix.hasGames;

  if (!showGoty && !showCategories) {
    return <p className="text-muted">No results for this board yet.</p>;
  }

  return (
    <div>
      <div
        className="mb-6 flex flex-wrap items-center gap-x-2"
        aria-label="Results layout"
      >
        {LAYOUTS.map((opt, i) => (
          <span key={opt.id} className="contents">
            {i > 0 ? (
              <span className="text-muted" aria-hidden>
                ·
              </span>
            ) : null}
            <button
              type="button"
              className={navItemClass("tertiary", layout === opt.id)}
              aria-pressed={layout === opt.id}
              onClick={() => setLayout(opt.id)}
            >
              {opt.label}
            </button>
          </span>
        ))}
      </div>

      {showGoty ? (
        <EditionGotyHighlights
          slug={slug}
          year={year}
          topTen={topTen}
          matrix={matrix}
          gotyTotal={gotyTotal}
          standingsHref={standingsHref}
          youBallotHref={youBallotHref}
          layout={layout}
        />
      ) : null}

      {showCategories ? (
        <EditionCategoriesHighlights
          slug={slug}
          year={year}
          categoriesHref={categoriesHref}
          categoryPodiums={categoryPodiums}
          categoryComparison={categoryComparison}
          youBallotHref={youBallotHref}
          layout={layout}
        />
      ) : null}
    </div>
  );
}
