import { EditionCategoriesHighlights } from "@/components/communities/EditionCategoriesHighlights";
import { EditionGotyHighlights } from "@/components/communities/EditionGotyHighlights";
import type {
  EditionBallotMatrix,
  EditionCategoryComparisonMatrix,
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
} from "@/lib/communities/edition-results";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

export type ResultsBoardLayout = "ranked" | "comparison";

export function EditionResultsOverview({
  slug,
  year,
  mode = "community",
  layout = "ranked",
  topTen,
  matrix,
  gotyTotal,
  standingsHref,
  categoryPodiums,
  categoryComparison,
  youBallotHref,
}: {
  slug: string;
  year: number;
  mode?: EditionResultsPublicMode;
  layout?: ResultsBoardLayout;
  topTen: EditionGotyStandingRow[];
  matrix: EditionBallotMatrix;
  gotyTotal: number;
  standingsHref: string;
  categoryPodiums: EditionCategoryStandingBlock[];
  categoryComparison: EditionCategoryComparisonMatrix;
  youBallotHref: string | null;
}) {
  const showCategories =
    categoryPodiums.length > 0 || categoryComparison.hasGames;
  const showGoty = topTen.length > 0 || matrix.hasGames;

  if (!showGoty && !showCategories) {
    return <p className="text-muted">No results for this board yet.</p>;
  }

  return (
    <div>
      {showGoty || layout === "comparison" ? (
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

      {showCategories ||
      (layout === "comparison" && categoryComparison.hasGames) ? (
        <EditionCategoriesHighlights
          slug={slug}
          year={year}
          mode={mode}
          categoryPodiums={categoryPodiums}
          categoryComparison={categoryComparison}
          youBallotHref={youBallotHref}
          layout={layout}
        />
      ) : null}
    </div>
  );
}
