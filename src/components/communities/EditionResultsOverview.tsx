"use client";

import { useCallback, useEffect, useState } from "react";
import { EditionCategoriesHighlights } from "@/components/communities/EditionCategoriesHighlights";
import { EditionGotyHighlights } from "@/components/communities/EditionGotyHighlights";
import {
  useEditionResultsLayout,
  type ResultsBoardLayout,
} from "@/components/communities/EditionResultsLayout";
import { controlGroupBarClass, segmentFitBtnClass } from "@/components/ui/controls";
import type {
  EditionBallotMatrix,
  EditionCategoryComparisonMatrix,
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
} from "@/lib/communities/edition-results";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

export type { ResultsBoardLayout };

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

  const board = useEditionResultsLayout();
  const [localLayout, setLocalLayout] = useState<ResultsBoardLayout>("ranked");
  const layout = board?.layout ?? localLayout;
  const setLayout = board?.setLayout ?? setLocalLayout;
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

  useEffect(() => {
    if (layout === "comparison") {
      void loadComparison();
    }
  }, [layout, loadComparison]);

  const selectLayout = (next: ResultsBoardLayout) => {
    setLayout(next);
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
      {board ? null : (
        <div
          role="group"
          aria-label="Results layout"
          className={`${controlGroupBarClass} mb-6 w-fit`}
        >
          {LAYOUTS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={segmentFitBtnClass(layout === opt.id)}
              aria-pressed={layout === opt.id}
              onClick={() => selectLayout(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

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
