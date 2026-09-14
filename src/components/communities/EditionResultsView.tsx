import Link from "next/link";
import { EditionBallotReadonly } from "@/components/communities/EditionBallotReadonly";
import type { EditionBallotCustomCategoryVoteView } from "@/lib/communities/ballots";
import type { CustomCategoryView } from "@/lib/communities/custom-category-types";
import { EditionCategoryDebugProvider } from "@/components/communities/EditionCategoryDebug";
import {
  EditionCategoryDetail,
  EditionCategoryResults,
} from "@/components/communities/EditionCategoryResults";
import { EditionFullStandings } from "@/components/communities/EditionFullStandings";
import { EditionResultsOverview } from "@/components/communities/EditionResultsOverview";
import { EditionRevealView } from "@/components/communities/EditionRevealView";
import { EditionResultsViewNav } from "@/components/communities/EditionResultsViewNav";

export { EditionResultsViewNav };
import { EditionVotersList } from "@/components/communities/EditionVotersList";
import { STANDINGS_PAGE_SIZE } from "@/lib/live-aggregate/service";
import { VoterProfileHandle } from "@/components/communities/VoterProfileHandle";
import { PersonIdentity } from "@/components/profile/PersonIdentity";
import { isAnonymizedVoter } from "@/lib/profile/delete-account";
import type {
  EditionBallotMatrix,
  EditionCategoryComparisonMatrix,
  EditionCategoryMeta,
  EditionCategoryStandingBlock,
  EditionCategoryStandingRow,
  EditionGotyStandingRow,
  EditionResultsMeta,
  EditionVoterListRow,
} from "@/lib/communities/edition-results";
import {
  editionResultsHref,
  editionVoterBallotHref,
} from "@/lib/communities/edition-results-href";
import {
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
  customCategoryVotes?: EditionBallotCustomCategoryVoteView[];
  customCategories?: CustomCategoryView[];
};

export function EditionResultsView({
  slug,
  year,
  communityName,
  mode,
  view,
  categoryId = null,
  meta,
  topTen,
  categoryPodiums,
  categoryComparison,
  categoryMeta,
  categoryPage = null,
  standingsPage = null,
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
  categoryId?: string | null;
  meta: EditionResultsMeta;
  topTen: EditionGotyStandingRow[];
  categoryPodiums: EditionCategoryStandingBlock[];
  categoryComparison: EditionCategoryComparisonMatrix;
  categoryMeta: EditionCategoryMeta[];
  categoryPage?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    rows: EditionCategoryStandingRow[];
  } | null;
  standingsPage?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    rows: EditionGotyStandingRow[];
  } | null;
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
    voter: EditionVoterListRow;
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
  const resultsHref = editionResultsHref(slug, year, {
    mode,
    view: "overview",
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
  const selectedCategory =
    view === "category" && categoryId
      ? (categoryMeta.find((c) => c.categoryId === categoryId) ?? null)
      : null;
  return (
    <EditionCategoryDebugProvider categoryPodiums={categoryPodiums}>
    <div className="mt-6 space-y-10">
      <EditionResultsViewNav
        slug={slug}
        year={year}
        mode={mode}
        view={view}
        categoryId={categoryId}
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
          page={standingsPage?.page ?? 1}
          pageSize={standingsPage?.pageSize ?? STANDINGS_PAGE_SIZE}
          total={standingsPage?.total ?? gotyTotal}
          totalPages={standingsPage?.totalPages ?? 1}
          rows={standingsPage?.rows ?? []}
        />
      ) : view === "category" ? (
        selectedCategory && categoryPage ? (
          <EditionCategoryDetail
            slug={slug}
            year={year}
            mode={mode}
            category={selectedCategory}
            page={categoryPage.page}
            pageSize={categoryPage.pageSize}
            total={categoryPage.total}
            totalPages={categoryPage.totalPages}
            rows={categoryPage.rows}
          />
        ) : (
          <section>
            <p className="text-sm text-muted">
              <Link href={categoriesHref} className="text-accent hover:underline">
                ← Categories
              </Link>
            </p>
            <p className="mt-4 text-muted">
              That category was not found on this board.
            </p>
          </section>
        )
      ) : view === "categories" ? (
        <EditionCategoryResults
          slug={slug}
          year={year}
          mode={mode}
          categoryPodiums={categoryPodiums}
        />
      ) : viewingPublicBallot && publicBallot ? (
        <section>
          <p className="text-sm text-muted">
            <Link href={votersHref} className="text-accent hover:underline">
              Voters
            </Link>
          </p>
          <div className="mt-3">
            <PersonIdentity
              displayName={publicBallot.voter.displayName}
              username={publicBallot.voter.username}
              avatarUrl={publicBallot.voter.avatarUrl}
              size={56}
              nameSuffix={publicBallot.voter.isVoice ? " · Host" : undefined}
              nameClassName="font-display text-3xl tracking-wide text-ink"
              subtitle={
                isAnonymizedVoter(publicBallot.voter) ? null : (
                  <p className="mt-1 text-sm text-muted">
                    <VoterProfileHandle
                      username={publicBallot.voter.username}
                      displayName={publicBallot.voter.displayName}
                    />
                  </p>
                )
              }
            />
          </div>
          <EditionBallotReadonly
            items={publicBallot.items}
            categoryVotes={publicBallot.categoryVotes}
            categories={publicBallot.categories}
            customCategoryVotes={publicBallot.customCategoryVotes}
            customCategories={publicBallot.customCategories}
            emptyMessage="This voter did not submit a ballot for this edition."
            exportToList={
              yourProfileId && publicBallot.voter.profileId === yourProfileId
                ? { slug, year }
                : null
            }
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
          customCategoryVotes={yourBallot.customCategoryVotes}
          customCategories={yourBallot.customCategories}
          emptyMessage="You did not submit a ballot for this edition."
          exportToList={{ slug, year }}
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
          slug={slug}
          year={year}
          communityName={communityName}
          topTen={topTen}
          categoryPodiums={categoryPodiums}
          resultsHref={resultsHref}
        />
      ) : (
        <EditionResultsOverview
          slug={slug}
          year={year}
          mode={mode}
          layout={view === "comparison" ? "comparison" : "ranked"}
          topTen={topTen}
          matrix={matrix}
          gotyTotal={gotyTotal}
          standingsHref={standingsHref}
          categoryPodiums={categoryPodiums}
          categoryComparison={categoryComparison}
          youBallotHref={youBallotHref}
        />
      )}
    </div>
    </EditionCategoryDebugProvider>
  );
}
