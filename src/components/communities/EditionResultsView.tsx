import Link from "next/link";
import { EditionBallotReadonly } from "@/components/communities/EditionBallotReadonly";
import {
  EditionCategoryDebugBar,
  EditionCategoryDebugProvider,
} from "@/components/communities/EditionCategoryDebug";
import { EditionCategoryResults } from "@/components/communities/EditionCategoryResults";
import { EditionFullStandings } from "@/components/communities/EditionFullStandings";
import { EditionResultsOverview } from "@/components/communities/EditionResultsOverview";
import { EditionRevealView } from "@/components/communities/EditionRevealView";
import { EditionVotersList } from "@/components/communities/EditionVotersList";
import { navItemClass } from "@/components/ui/navLevels";
import type {
  EditionBallotMatrix,
  EditionCategoryComparisonMatrix,
  EditionCategoryMeta,
  EditionCategoryStandingBlock,
  EditionGotyStandingRow,
  EditionResultsMeta,
  EditionVoterListRow,
} from "@/lib/communities/edition-results";
import {
  editionResultsHref,
  editionHostSettingsHref,
  editionVoterBallotHref,
} from "@/lib/communities/edition-results-href";
import {
  editionBoardLabel,
  type EditionResultsPublicMode,
  type EditionResultsViewId,
  type SharedRankMode,
} from "@/lib/communities/edition-results-scoring";

type BallotPayload = {
  items: Array<{
    gameId: string;
    slug?: string;
    title: string;
    coverUrl: string | null;
    rank: number;
    blurb?: string | null;
  }>;
  categoryVotes: Array<{
    categoryId: string;
    title: string;
    coverUrl: string | null;
  }>;
  categories: Array<{ id: string; label: string }>;
};

export function EditionResultsViewNav({
  slug,
  year,
  mode,
  view,
  votersPage = 1,
  votersQ = "",
  hasYourBallot,
  canManage,
  viewingPublicBallot = false,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  view: EditionResultsViewId;
  votersPage?: number;
  votersQ?: string;
  hasYourBallot: boolean;
  canManage: boolean;
  viewingPublicBallot?: boolean;
}) {
  const views: Array<{ id: EditionResultsViewId; label: string }> = [
    { id: "reveal", label: "Reveal" },
    { id: "overview", label: "Results" },
    { id: "standings", label: "Full standings" },
    { id: "categories", label: "Categories" },
    { id: "voters", label: "Voters" },
  ];
  if (hasYourBallot) {
    views.push({ id: "ballot", label: "Your ballot" });
  }
  if (canManage) {
    views.push({ id: "settings", label: "Settings" });
  }
  const viewingYourBallot = view === "ballot" && !viewingPublicBallot && hasYourBallot;
  const showBoardModes = view !== "ballot" && view !== "settings";
  const modes: EditionResultsPublicMode[] = ["community", "voices"];

  return (
    <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-0">
      <div className="flex flex-wrap gap-5" aria-label="Results view">
        {views.map((v) => {
          const active =
            v.id === "settings"
              ? view === "settings"
              : v.id === "ballot"
                ? viewingYourBallot
                : v.id === "voters"
                  ? view === "voters" || viewingPublicBallot
                  : v.id === view && !viewingPublicBallot;
          return (
            <Link
              key={v.id}
              href={
                v.id === "settings"
                  ? editionHostSettingsHref(slug, year)
                  : editionResultsHref(slug, year, {
                      mode,
                      view: v.id,
                      votersPage,
                      q: votersQ,
                    })
              }
              className={navItemClass("secondary", active)}
            >
              {v.label}
            </Link>
          );
        })}
      </div>

      {showBoardModes ? (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1 pb-1.5"
          aria-label="Results board"
        >
          {modes.map((m, i) => (
            <span key={m} className="contents">
              {i > 0 ? (
                <span className="text-muted" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link
                href={editionResultsHref(slug, year, {
                  mode: m,
                  view,
                  votersPage: 1,
                  q: votersQ,
                })}
                className={navItemClass("tertiary", m === mode)}
              >
                {editionBoardLabel(m)}
              </Link>
            </span>
          ))}
          <EditionCategoryDebugBar />
        </div>
      ) : null}
    </div>
  );
}

export function EditionResultsView({
  slug,
  year,
  communityName,
  mode,
  rankMode = "competition",
  view,
  meta,
  topTen,
  categoryPodiums,
  categoryComparison,
  categoryMeta,
  voters,
  matrix,
  yourProfileId,
  yourBallot,
  publicBallot,
  voterUsername = null,
  canManage = false,
}: {
  slug: string;
  year: number;
  communityName: string;
  mode: EditionResultsPublicMode;
  rankMode?: SharedRankMode;
  view: EditionResultsViewId;
  meta: EditionResultsMeta;
  topTen: EditionGotyStandingRow[];
  categoryPodiums: EditionCategoryStandingBlock[];
  categoryComparison: EditionCategoryComparisonMatrix;
  categoryMeta: EditionCategoryMeta[];
  voters: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    rows: EditionVoterListRow[];
    q: string;
  };
  matrix: EditionBallotMatrix;
  yourProfileId: string | null;
  yourBallot: BallotPayload | null;
  /** Frozen public ballot when `?voter=` is set. */
  publicBallot: (BallotPayload & {
    voter: {
      displayName: string;
      username: string;
      isVoice: boolean;
      profileId: string;
    };
  }) | null;
  /** Raw `?voter=` value — used when lookup misses. */
  voterUsername?: string | null;
  canManage?: boolean;
}) {
  const gotyTotal =
    mode === "voices" ? meta.gotyTotalVoices : meta.gotyTotalCommunity;
  const standingsHref = editionResultsHref(slug, year, {
    mode,
    view: "standings",
  });
  const categoriesHref = editionResultsHref(slug, year, {
    mode,
    view: "categories",
  });
  const votersHref = editionResultsHref(slug, year, {
    mode,
    view: "voters",
  });
  const youBallotHref = yourBallot
    ? editionVoterBallotHref(slug, year)
    : null;
  const requestedPublicVoter = Boolean(voterUsername?.trim());
  const viewingPublicBallot = view === "ballot" && publicBallot != null;
  const viewingMissingVoter =
    view === "ballot" && requestedPublicVoter && publicBallot == null;
  const viewingYourBallot =
    view === "ballot" &&
    !requestedPublicVoter &&
    yourBallot != null;

  return (
    <EditionCategoryDebugProvider categoryPodiums={categoryPodiums}>
    <div className="mt-6 space-y-10">
      <EditionResultsViewNav
        slug={slug}
        year={year}
        mode={mode}
        view={view}
        votersPage={voters.page}
        votersQ={voters.q}
        hasYourBallot={yourBallot != null}
        canManage={canManage}
        viewingPublicBallot={viewingPublicBallot}
      />

      {view === "standings" ? (
        <EditionFullStandings
          slug={slug}
          year={year}
          mode={mode}
          rankMode={rankMode}
          totalGames={gotyTotal}
        />
      ) : view === "categories" ? (
        <EditionCategoryResults
          slug={slug}
          year={year}
          mode={mode}
          rankMode={rankMode}
          categories={categoryMeta}
        />
      ) : viewingPublicBallot && publicBallot ? (
        <section>
          <p className="text-sm text-muted">
            <Link href={votersHref} className="text-accent hover:underline">
              Voters
            </Link>
          </p>
          <h3 className="mt-3 font-display text-3xl tracking-wide text-ink">
            {publicBallot.voter.displayName}
            {publicBallot.voter.isVoice ? " · Host" : ""}
          </h3>
          <p className="mt-1 text-sm text-muted">
            <Link
              href={`/u/${publicBallot.voter.username}`}
              className="hover:text-accent hover:underline"
            >
              @{publicBallot.voter.username}
            </Link>
          </p>
          <EditionBallotReadonly
            items={publicBallot.items}
            categoryVotes={publicBallot.categoryVotes}
            categories={publicBallot.categories}
            emptyMessage="This voter did not submit a ballot for this edition."
          />
        </section>
      ) : viewingMissingVoter ? (
        <section>
          <p className="text-sm text-muted">
            <Link href={votersHref} className="text-accent hover:underline">
              Voters
            </Link>
          </p>
          <p className="mt-4 text-muted">
            No submitted ballot found for that voter.
          </p>
        </section>
      ) : viewingYourBallot && yourBallot ? (
        <EditionBallotReadonly
          items={yourBallot.items}
          categoryVotes={yourBallot.categoryVotes}
          categories={yourBallot.categories}
          emptyMessage="You did not submit a ballot for this edition."
        />
      ) : view === "voters" ? (
        <EditionVotersList
          slug={slug}
          year={year}
          mode={mode}
          voters={voters}
          yourProfileId={yourProfileId}
          revealBallots
        />
      ) : view === "reveal" ? (
        <EditionRevealView
          year={year}
          communityName={communityName}
          topTen={topTen}
          categoryPodiums={categoryPodiums}
        />
      ) : (
        <EditionResultsOverview
          slug={slug}
          year={year}
          topTen={topTen}
          matrix={matrix}
          gotyTotal={gotyTotal}
          standingsHref={standingsHref}
          categoriesHref={categoriesHref}
          categoryPodiums={categoryPodiums}
          categoryComparison={categoryComparison}
          youBallotHref={youBallotHref}
        />
      )}
    </div>
    </EditionCategoryDebugProvider>
  );
}
