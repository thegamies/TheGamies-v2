"use client";

import { useCallback, useState } from "react";
import { EditionCategoriesHighlights } from "@/components/communities/EditionCategoriesHighlights";
import { EditionGotyHighlights } from "@/components/communities/EditionGotyHighlights";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import type {
  EditionBallotMatrix,
  EditionCategoryComparisonMatrix,
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
} from "@/lib/communities/edition-results";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

export type ResultsBoardLayout = "ranked" | "comparison";

const LAYOUTS: Array<{ id: ResultsBoardLayout; label: string }> = [
  { id: "ranked", label: "Ranked" },
  { id: "comparison", label: "Comparison" },
];

const EMPTY_MATRIX: EditionBallotMatrix = {
  showYou: false,
  hasGames: false,
  voiceColumns: [],
  rows: [],
};

const EMPTY_CATEGORY_COMPARISON: EditionCategoryComparisonMatrix = {
  showYou: false,
  hasGames: false,
  voiceColumns: [],
  rows: [],
};

export function EditionResultsOverview({
  slug,
  year,
  mode = "community",
  topTen,
  matrix: initialMatrix,
  gotyTotal,
  standingsHref,
  categoryPodiums,
  categoryComparison: initialCategoryComparison,
  youBallotHref,
}: {
  slug: string;
  year: number;
  mode?: EditionResultsPublicMode;
  topTen: EditionGotyStandingRow[];
  matrix: EditionBallotMatrix;
  gotyTotal: number;
  standingsHref: string;
  categoryPodiums: EditionCategoryStandingBlock[];
  categoryComparison: EditionCategoryComparisonMatrix;
  youBallotHref: string | null;
}) {
  const hasSsrComparison =
    initialMatrix.hasGames || initialCategoryComparison.hasGames;

  const [layout, setLayout] = useState<ResultsBoardLayout>("ranked");
  const [fetchedMatrix, setFetchedMatrix] = useState(EMPTY_MATRIX);
  const [fetchedCategoryComparison, setFetchedCategoryComparison] = useState(
    EMPTY_CATEGORY_COMPARISON,
  );
  const [comparisonStatus, setComparisonStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const matrix = hasSsrComparison
    ? initialMatrix.hasGames
      ? initialMatrix
      : EMPTY_MATRIX
    : fetchedMatrix;
  const categoryComparison = hasSsrComparison
    ? initialCategoryComparison.hasGames
      ? initialCategoryComparison
      : EMPTY_CATEGORY_COMPARISON
    : fetchedCategoryComparison;
  const effectiveComparisonStatus = hasSsrComparison
    ? "ready"
    : comparisonStatus;

  const loadComparison = useCallback(async () => {
    if (
      hasSsrComparison ||
      comparisonStatus === "ready" ||
      comparisonStatus === "loading"
    ) {
      return;
    }
    setComparisonStatus("loading");
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(slug)}/edition/${year}/comparison`,
      );
      if (!res.ok) throw new Error("comparison fetch failed");
      const data = (await res.json()) as {
        matrix: EditionBallotMatrix;
        categoryComparison: EditionCategoryComparisonMatrix;
      };
      setFetchedMatrix(data.matrix);
      setFetchedCategoryComparison(data.categoryComparison);
      setComparisonStatus("ready");
    } catch {
      setComparisonStatus("error");
    }
  }, [comparisonStatus, hasSsrComparison, slug, year]);

  const selectLayout = (next: ResultsBoardLayout) => {
    setLayout(next);
    if (next === "comparison") {
      void loadComparison();
    }
  };

  const showCategories =
    categoryPodiums.length > 0 || categoryComparison.hasGames;
  const showGoty = topTen.length > 0 || matrix.hasGames;
  const comparisonPending =
    layout === "comparison" &&
    (effectiveComparisonStatus === "loading" ||
      effectiveComparisonStatus === "idle");
  const comparisonFailed =
    layout === "comparison" && effectiveComparisonStatus === "error";

  if (!showGoty && !showCategories && layout === "ranked") {
    return <p className="text-muted">No results for this board yet.</p>;
  }

  return (
    <div>
      <ScrollableNav
        aria-label="Results layout"
        border={false}
        className="mb-6"
        rowClassName="items-center gap-x-2"
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
              onClick={() => selectLayout(opt.id)}
            >
              {opt.label}
            </button>
          </span>
        ))}
      </ScrollableNav>

      {comparisonPending ? (
        <p className="text-muted">Loading comparison…</p>
      ) : null}
      {comparisonFailed ? (
        <p className="text-muted">Could not load comparison. Try again.</p>
      ) : null}

      {!comparisonPending && !comparisonFailed ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}
