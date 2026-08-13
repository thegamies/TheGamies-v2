import Link from "next/link";
import { EditionBallotReadonly } from "@/components/communities/EditionBallotReadonly";
import {
  EditionCategoryDebugBar,
  EditionCategoryDebugProvider,
} from "@/components/communities/EditionCategoryDebug";
import { EditionCategoriesHighlights } from "@/components/communities/EditionCategoriesHighlights";
import { EditionCategoryResults } from "@/components/communities/EditionCategoryResults";
import { EditionFullStandings } from "@/components/communities/EditionFullStandings";
import { EditionGotyHighlights } from "@/components/communities/EditionGotyHighlights";
import { EditionRevealView } from "@/components/communities/EditionRevealView";
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
  editionVoterBallotHref,
} from "@/lib/communities/edition-results-href";
import type {
  EditionResultsPublicMode,
  EditionResultsViewId,
  SharedRankMode,
} from "@/lib/communities/edition-results-scoring";

type BallotPayload = {
  items: Array<{
    gameId: string;
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
}) {
  const modes: EditionResultsPublicMode[] = ["community", "voices"];
  const views: Array<{ id: EditionResultsViewId; label: string }> = [
    { id: "reveal", label: "Reveal" },
    { id: "overview", label: "Highlights" },
    { id: "standings", label: "Full standings" },
    { id: "categories", label: "Categories" },
    { id: "voters", label: "Voters" },
  ];
  if (yourBallot) {
    views.push({ id: "ballot", label: "Your ballot" });
  }
  const gotyTotal =
    mode === "voices" ? meta.gotyTotalVoices : meta.gotyTotalCommunity;
  const standingsHref = editionResultsHref(slug, year, {
    mode,
    view: "standings",
    rank: rankMode,
  });
  const categoriesHref = editionResultsHref(slug, year, {
    mode,
    view: "categories",
    rank: rankMode,
  });
  const votersHref = editionResultsHref(slug, year, {
    mode,
    view: "voters",
    rank: rankMode,
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
  const showBoardModes = view !== "ballot";

  return (
    <EditionCategoryDebugProvider categoryPodiums={categoryPodiums}>
    <div className="mt-6 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-0">
        <div className="flex flex-wrap gap-5" aria-label="Results view">
          {views.map((v) => {
            const active =
              v.id === "ballot"
                ? viewingYourBallot
                : v.id === "voters"
                  ? view === "voters" || viewingPublicBallot
                  : v.id === view && !viewingPublicBallot;
            return (
              <Link
                key={v.id}
                href={editionResultsHref(slug, year, {
                  mode,
                  view: v.id,
                  votersPage: voters.page,
                  q: voters.q,
                  rank: rankMode,
                })}
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
                    q: voters.q,
                    rank: rankMode,
                  })}
                  className={`capitalize ${navItemClass("tertiary", m === mode)}`}
                >
                  {m}
                </Link>
              </span>
            ))}
            <span className="text-muted" aria-hidden>
              ·
            </span>
            {(
              [
                { id: "competition" as const, label: "Competition" },
                { id: "dense" as const, label: "Dense" },
              ] as const
            ).map((opt, i) => (
              <span key={opt.id} className="contents">
                {i > 0 ? (
                  <span className="text-muted" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link
                  href={editionResultsHref(slug, year, {
                    mode,
                    view,
                    votersPage: 1,
                    q: voters.q,
                    rank: opt.id,
                  })}
                  className={navItemClass("tertiary", opt.id === rankMode)}
                  title={
                    opt.id === "dense"
                      ? "Equal scores share a rank; next score is the next number (1 · 1 · 2)"
                      : "Equal scores share a rank; next score skips (1 · 1 · 3)"
                  }
                >
                  {opt.label}
                </Link>
              </span>
            ))}
            <EditionCategoryDebugBar />
          </div>
        ) : null}
      </div>

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
            {publicBallot.voter.isVoice ? " · Voice" : ""}
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
        <section>
          <p className="text-sm text-muted">
            {voters.total} submitted ballot{voters.total === 1 ? "" : "s"}
            {mode === "voices" ? " · Voices" : ""}
          </p>
          <form className="mt-4 flex flex-wrap gap-2" method="get">
            {mode !== "community" ? (
              <input type="hidden" name="mode" value={mode} />
            ) : null}
            {rankMode !== "competition" ? (
              <input type="hidden" name="rank" value={rankMode} />
            ) : null}
            <input type="hidden" name="view" value="voters" />
            <input
              name="q"
              defaultValue={voters.q}
              placeholder="Search voters"
              className="border border-line bg-paper px-3 py-2 text-sm text-ink"
              aria-label="Search voters"
            />
            <button
              type="submit"
              className="border border-line px-3 py-2 text-sm text-ink hover:border-accent"
            >
              Search
            </button>
          </form>
          {voters.rows.length === 0 ? (
            <p className="mt-6 text-muted">
              {voters.q
                ? "No voters match that search."
                : "No submitted ballots yet."}
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {voters.rows.map((v) => (
                <li key={v.profileId} className="py-3">
                  <Link
                    href={editionVoterBallotHref(slug, year, v.username)}
                    className="text-ink hover:text-accent"
                  >
                    {v.displayName}
                    {yourProfileId === v.profileId ? " (you)" : ""}
                  </Link>
                  <p className="text-sm text-muted">
                    <Link
                      href={`/u/${v.username}`}
                      className="hover:text-accent hover:underline"
                    >
                      @{v.username}
                    </Link>
                    {v.isVoice ? " · Voice" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {voters.totalPages > 1 ? (
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {voters.page > 1 ? (
                <Link
                  href={editionResultsHref(slug, year, {
                    mode,
                    view: "voters",
                    votersPage: voters.page - 1,
                    q: voters.q,
                    rank: rankMode,
                  })}
                  className="text-accent hover:underline"
                >
                  Previous
                </Link>
              ) : null}
              <span className="text-muted">
                Page {voters.page} of {voters.totalPages}
              </span>
              {voters.page < voters.totalPages ? (
                <Link
                  href={editionResultsHref(slug, year, {
                    mode,
                    view: "voters",
                    votersPage: voters.page + 1,
                    q: voters.q,
                    rank: rankMode,
                  })}
                  className="text-accent hover:underline"
                >
                  Next
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : view === "reveal" ? (
        <EditionRevealView
          year={year}
          communityName={communityName}
          topTen={topTen}
          categoryPodiums={categoryPodiums}
        />
      ) : (
        <>
          <EditionGotyHighlights
            slug={slug}
            year={year}
            topTen={topTen}
            matrix={matrix}
            gotyTotal={gotyTotal}
            standingsHref={standingsHref}
            youBallotHref={youBallotHref}
            rankMode={rankMode}
          />

          {categoryPodiums.length > 0 || categoryComparison.hasGames ? (
            <EditionCategoriesHighlights
              slug={slug}
              year={year}
              categoriesHref={categoriesHref}
              categoryPodiums={categoryPodiums}
              categoryComparison={categoryComparison}
              youBallotHref={youBallotHref}
            />
          ) : null}
        </>
      )}
    </div>
    </EditionCategoryDebugProvider>
  );
}
