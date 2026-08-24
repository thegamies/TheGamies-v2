import Link from "next/link";
import { EditionCategoryResults } from "@/components/communities/EditionCategoryResults";
import { EditionFullStandings } from "@/components/communities/EditionFullStandings";
import { EditionResultsCalculatingBanner } from "@/components/communities/EditionResultsCalculatingBanner";
import { EditionResultsOverview } from "@/components/communities/EditionResultsOverview";
import { EditionRevealView } from "@/components/communities/EditionRevealView";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import type {
  EditionBallotMatrix,
  EditionCategoryComparisonMatrix,
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
} from "@/lib/communities/edition-results";
import { editionHostRevealShowHref } from "@/lib/communities/edition-results-href";
import type { EditionShowSource } from "@/lib/communities/edition-results-scoring";
import type { EditionFreezeStatus } from "@/lib/communities/edition-freeze";

export type HostResultsPreviewView =
  | "show"
  | "overview"
  | "standings"
  | "categories";

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

const PREVIEW_VIEWS: Array<{ id: HostResultsPreviewView; label: string }> = [
  { id: "show", label: "Reveal" },
  { id: "overview", label: "Results" },
  { id: "standings", label: "Full standings" },
  { id: "categories", label: "Categories" },
];

export function EditionHostResultsPreview({
  slug,
  year,
  communityName,
  source,
  previewView,
  topTen,
  gotyBoard,
  gotyTotal,
  categoryPodiums,
  matrix = EMPTY_MATRIX,
  categoryComparison = EMPTY_CATEGORY_COMPARISON,
  freezeStatus,
  liveReady,
}: {
  slug: string;
  year: number;
  communityName: string;
  source: EditionShowSource;
  previewView: HostResultsPreviewView;
  topTen: EditionGotyStandingRow[];
  gotyBoard: EditionGotyStandingRow[];
  gotyTotal: number;
  categoryPodiums: EditionCategoryStandingBlock[];
  matrix?: EditionBallotMatrix;
  categoryComparison?: EditionCategoryComparisonMatrix;
  freezeStatus: EditionFreezeStatus;
  /** True when live freeze rows were loaded. */
  liveReady: boolean;
}) {
  const isLive = source === "live";
  const demoHref = editionHostRevealShowHref(slug, year, {
    source: "demo",
    view: previewView,
  });
  const liveHref = editionHostRevealShowHref(slug, year, {
    source: "live",
    view: previewView,
  });
  const resultsHref = editionHostRevealShowHref(slug, year, {
    source,
    view: "overview",
  });
  const standingsHref = editionHostRevealShowHref(slug, year, {
    source,
    view: "standings",
  });

  return (
    <div className="mt-6">
      <div className="max-w-2xl border border-line bg-panel px-4 py-4">
        <h4 className="font-display text-xl tracking-wide text-ink">
          Results preview
        </h4>
        {isLive ? (
          <p className="mt-2 text-sm text-muted">
            Showing this event’s real standings. Only hosts can see this until
            results publish.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Placeholder covers and Game 1… names so you can walk Reveal,
            Results, Full standings, and Categories without seeing real scores.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isLive ? (
            <Link
              href={demoHref}
              className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
            >
              Back to demo
            </Link>
          ) : (
            <Link
              href={liveHref}
              className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
            >
              Show real results
            </Link>
          )}
        </div>
      </div>

      <ScrollableNav aria-label="Results preview view" className="mt-6">
        {PREVIEW_VIEWS.map((v) => (
          <Link
            key={v.id}
            href={editionHostRevealShowHref(slug, year, {
              source,
              view: v.id,
            })}
            scroll={false}
            className={navItemClass("tertiary", previewView === v.id)}
          >
            {v.label}
          </Link>
        ))}
      </ScrollableNav>

      {isLive && !liveReady ? (
        <div className="mt-8">
          <EditionResultsCalculatingBanner status={freezeStatus} />
        </div>
      ) : previewView === "show" ? (
        <div className="mt-8" key={`show-${source}`}>
          <EditionRevealView
            slug={slug}
            year={year}
            communityName={communityName}
            topTen={topTen}
            categoryPodiums={categoryPodiums}
            resultsHref={resultsHref}
            continueLabel="Continue to Results"
          />
        </div>
      ) : previewView === "standings" ? (
        <div className="mt-8" key={`standings-${source}`}>
          <EditionFullStandings
            slug={slug}
            year={year}
            mode="community"
            page={1}
            pageSize={gotyBoard.length || 1}
            total={gotyTotal}
            totalPages={1}
            rows={gotyBoard}
            paginate={false}
          />
        </div>
      ) : previewView === "categories" ? (
        <div className="mt-8" key={`categories-${source}`}>
          <EditionCategoryResults
            slug={slug}
            year={year}
            mode="community"
            categoryPodiums={categoryPodiums}
            showFullStandingsLinks={false}
          />
        </div>
      ) : (
        <div className="mt-8" key={`results-${source}`}>
          <EditionResultsOverview
            slug={slug}
            year={year}
            mode="community"
            topTen={topTen}
            matrix={matrix}
            gotyTotal={gotyTotal}
            standingsHref={standingsHref}
            categoryPodiums={categoryPodiums}
            categoryComparison={categoryComparison}
            youBallotHref={null}
          />
        </div>
      )}
    </div>
  );
}
