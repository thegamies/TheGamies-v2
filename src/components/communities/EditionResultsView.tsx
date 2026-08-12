import Link from "next/link";
import { BallotMatrix } from "@/components/communities/BallotMatrix";
import { EditionBallotReadonly } from "@/components/communities/EditionBallotReadonly";
import {
  EditionCategoryPodiums,
  EditionCategoryResults,
} from "@/components/communities/EditionCategoryResults";
import { EditionFullStandings } from "@/components/communities/EditionFullStandings";
import {
  StandingGameCard,
  WinnerPodium,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { navItemClass } from "@/components/ui/navLevels";
import { SectionRule } from "@/components/ui/SectionRule";
import type {
  EditionBallotMatrix,
  EditionCategoryMeta,
  EditionCategoryPickCard,
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
  mode,
  view,
  meta,
  topTen,
  categoryPodiums,
  categoryPickStrips,
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
  mode: EditionResultsPublicMode;
  view: EditionResultsViewId;
  meta: EditionResultsMeta;
  topTen: EditionGotyStandingRow[];
  categoryPodiums: EditionCategoryStandingBlock[];
  categoryPickStrips: Record<string, EditionCategoryPickCard[]>;
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
  const winner = topTen[0] ?? null;
  const podium = topTen.slice(1, 3);
  const modes: EditionResultsPublicMode[] = ["community", "voices"];
  const views: Array<{ id: EditionResultsViewId; label: string }> = [
    { id: "overview", label: "Highlights" },
    { id: "standings", label: "Full standings" },
    { id: "categories", label: "Categories" },
    { id: "voters", label: "Voters" },
  ];
  if (yourBallot) {
    views.push({ id: "ballot", label: "Your ballot" });
  }
  const ballotCount =
    mode === "voices" ? meta.ballotCountVoices : meta.ballotCountCommunity;
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
  const showBoardModes = view !== "ballot";

  return (
    <div className="mt-8 space-y-14">
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
                  })}
                  className={`capitalize ${navItemClass("tertiary", m === mode)}`}
                >
                  {m}
                </Link>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {view === "standings" ? (
        <EditionFullStandings
          slug={slug}
          year={year}
          mode={mode}
          totalGames={gotyTotal}
        />
      ) : view === "categories" ? (
        <EditionCategoryResults
          slug={slug}
          year={year}
          mode={mode}
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
                  })}
                  className="text-accent hover:underline"
                >
                  Next
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <>
          {winner ? (
            <section>
              <h3 className="font-display text-3xl tracking-wide text-ink">
                GOTY Top 3
              </h3>
              <div className="mt-6">
                <WinnerPodium
                  winner={{
                    place: winner.place,
                    gameId: winner.gameId,
                    slug: winner.slug,
                    title: winner.title,
                    coverUrl: winner.coverUrl,
                    meta: `${winner.points} points · ${winner.firstPlaceVotes} first-place votes · ${ballotCount} ballots`,
                  }}
                  runnersUp={podium.map((row) => ({
                    place: row.place,
                    gameId: row.gameId,
                    slug: row.slug,
                    title: row.title,
                    coverUrl: row.coverUrl,
                    meta: `${row.points} points`,
                  }))}
                />
              </div>
            </section>
          ) : (
            <p className="text-muted">
              No Game of the Year scores for this mode.
            </p>
          )}

          {topTen.length > 3 ? (
            <section className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h3 className="font-display text-3xl tracking-wide text-ink">
                  Rest of the Top 10
                </h3>
                {gotyTotal > 10 ? (
                  <Link
                    href={standingsHref}
                    className="text-sm text-accent hover:underline"
                  >
                    Full standings
                  </Link>
                ) : null}
              </div>
              <HorizontalScroll className="mt-6" label="rest of the top 10">
                <ul className="flex w-max min-w-full flex-nowrap gap-4 lg:w-full lg:gap-5">
                  {topTen.slice(3, 10).map((row) => (
                    <li
                      key={row.gameId}
                      className="w-[132px] shrink-0 lg:w-auto lg:min-w-0 lg:flex-1"
                    >
                      <StandingGameCard
                        place={row.place}
                        slug={row.slug}
                        title={row.title}
                        coverUrl={row.coverUrl}
                        year={row.year}
                        points={row.points}
                      />
                    </li>
                  ))}
                </ul>
              </HorizontalScroll>
            </section>
          ) : null}

          <BallotMatrix
            matrix={matrix}
            slug={slug}
            year={year}
            youBallotHref={youBallotHref}
          />

          {categoryPodiums.length > 0 ? (
            <section>
              <SectionRule className="mb-8" />
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h3 className="font-display text-3xl tracking-wide text-ink">
                  Categories
                </h3>
                <Link
                  href={categoriesHref}
                  className="text-sm text-accent hover:underline"
                >
                  Full category results
                </Link>
              </div>
              <EditionCategoryPodiums
                slug={slug}
                year={year}
                categories={categoryPodiums}
                pickStrips={categoryPickStrips}
                youBallotHref={youBallotHref}
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
