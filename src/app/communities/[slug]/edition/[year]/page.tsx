import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MembershipActions } from "@/app/communities/[slug]/MembershipActions";
import {
  EditionBallotEditor,
  type EditionBallotEditorItem,
} from "@/components/communities/EditionBallotEditor";
import { EditionBallotPreview } from "@/components/communities/EditionBallotPreview";
import { EditionBallotReadonly } from "@/components/communities/EditionBallotReadonly";
import { EditionEventTabs } from "@/components/communities/EditionEventTabs";
import {
  EditionResultsView,
  EditionResultsViewNav,
} from "@/components/communities/EditionResultsView";
import { EditionVotersList } from "@/components/communities/EditionVotersList";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { EditionSectionHeader } from "@/components/communities/EditionSectionHeader";
import { EditionYearSettings } from "@/components/communities/EditionYearSettings";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  capEditionBallotItems,
  EDITION_BALLOT_MAX_ITEMS,
} from "@/lib/communities/ballot-schema";
import {
  canSubmitEditionBallot,
  countEditionSubmittedBallots,
  getEditionBallotForProfile,
  getLiveEditionVotersPage,
  listEditionBallotSubmitters,
} from "@/lib/communities/ballots";
import {
  CATEGORY_RANKED_TOP,
  ensurePublishedEditionResults,
  getEditionCategoryResults,
  getEditionGotyThroughRank,
  getEditionResultsMeta,
  getEditionVotersPage,
  getEditionVoterDetailByUsername,
  listEditionCategoryMeta,
  parseEditionResultMode,
  parseEditionResultsView,
  type EditionBallotMatrix,
  type EditionCategoryComparisonMatrix,
  type EditionCategoryMeta,
  type EditionCategoryStandingBlock,
} from "@/lib/communities/edition-results";
import {
  getEditionByCommunityYear,
  listEditionsForCommunity,
  pickFeaturedEdition,
  type CommunityEditionPublic,
} from "@/lib/communities/editions";
import { showEditionNav } from "@/lib/communities/edition-status";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";
import { listMembersWithEditionVoiceFlags } from "@/lib/communities/voices";
import { listActiveAwardCategories } from "@/lib/live-aggregate/categories";
import { STANDINGS_PAGE_SIZE } from "@/lib/live-aggregate/service";
import { getOwnedGotyItemsForYear } from "@/lib/lists/service";

type Params = Promise<{ slug: string; year: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, year: yearRaw } = await params;
  const year = Number(yearRaw);
  try {
    const community = await getCommunityBySlug(slug);
    if (!community) return { title: "Event" };
    if (!Number.isFinite(year)) {
      return { title: `${community.name} event` };
    }
    return {
      title: `${community.name} ${Math.floor(year)} event`,
      description: `${community.name} Game of the Year event.`,
    };
  } catch {
    return { title: "Event" };
  }
}

export default async function CommunityEditionYearPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug, year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isFinite(year) || year < 1970 || year > 2100) notFound();
  const y = Math.floor(year);

  const sp = await searchParams;
  const mode = parseEditionResultMode(first(sp.mode));
  const votersPageRaw = Number(first(sp.votersPage) ?? "1");
  const votersPageNum =
    Number.isFinite(votersPageRaw) && votersPageRaw >= 1
      ? Math.floor(votersPageRaw)
      : 1;
  const votersQ = (first(sp.q) ?? "").trim();
  const voterUsername = (first(sp.voter) ?? "").trim();

  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  let community;
  try {
    community = await getCommunityBySlug(slug, profile?.id);
  } catch {
    community = null;
  }
  if (!community) notFound();

  let edition: CommunityEditionPublic | null = null;
  let publicEditions: CommunityEditionPublic[] = [];
  try {
    const editions = await listEditionsForCommunity(community.id);
    publicEditions = editions.filter((e) => showEditionNav(e.status));
    edition = await getEditionByCommunityYear(community.id, y);
  } catch {
    edition = null;
  }

  if (!edition || !showEditionNav(edition.status)) notFound();

  const rankMode = edition.rankMode;
  const canManage = canManageCommunity(community.viewerRole);
  const featured = pickFeaturedEdition(publicEditions);
  const navStatus = featured?.status ?? edition.status;
  const yearOptions = publicEditions.map((e) => e.year).sort((a, b) => b - a);

  const isMember = canSubmitEditionBallot(community.viewerRole);
  const signInHref = `/auth/sign-in?next=/communities/${encodeURIComponent(community.slug)}/edition/${y}`;

  let ballot = null;
  if (profile && isMember) {
    try {
      ballot = await getEditionBallotForProfile(edition.id, profile.id);
    } catch {
      ballot = null;
    }
  }

  let siteGotyItems: EditionBallotEditorItem[] | null = null;
  if (profile && isMember && edition.status === "open") {
    try {
      const owned = await getOwnedGotyItemsForYear(profile.id, edition.year, {
        limit: EDITION_BALLOT_MAX_ITEMS,
      });
      siteGotyItems =
        owned && owned.length > 0
          ? capEditionBallotItems(
              owned.map((item) => ({
                gameId: item.gameId,
                igdbId: item.igdbId,
                slug: item.slug,
                title: item.title,
                year: item.year,
                coverUrl: item.coverUrl,
                rank: item.rank,
                blurb: item.blurb ?? "",
              })),
            )
          : null;
    } catch {
      siteGotyItems = null;
    }
  }

  const awardCategories =
    edition.status === "open" ||
    edition.status === "scheduled" ||
    (profile && isMember) ||
    (edition.status === "published" && voterUsername.length > 0)
      ? await listActiveAwardCategories().catch(() => [])
      : [];

  const requestedView = parseEditionResultsView(first(sp.view));
  let view = requestedView;
  if (view === "settings" && !canManage) {
    view = "reveal";
  }
  if (
    view === "ballot" &&
    !(profile && isMember) &&
    !voterUsername
  ) {
    view = "reveal";
  }
  const showHostSettings = canManage && view === "settings";
  const showLiveVoters =
    edition.status === "open" || edition.status === "closed";
  const prePublishView = showHostSettings
    ? "settings"
    : showLiveVoters && view === "voters"
      ? "voters"
      : "ballot";

  let ballotCount: number | null = null;
  if (
    edition.status === "open" ||
    edition.status === "closed" ||
    edition.status === "published"
  ) {
    try {
      ballotCount = await countEditionSubmittedBallots(edition.id);
    } catch {
      ballotCount = 0;
    }
  }

  let liveVoters: Awaited<ReturnType<typeof getLiveEditionVotersPage>> & {
    q: string;
  } | null = null;
  if (showLiveVoters && prePublishView === "voters") {
    try {
      const voters = await getLiveEditionVotersPage(edition.id, {
        page: votersPageNum,
        pageSize: STANDINGS_PAGE_SIZE,
        q: votersQ,
        voicesOnly: mode === "voices",
      });
      liveVoters = { ...voters, q: votersQ };
    } catch {
      liveVoters = {
        page: 1,
        pageSize: STANDINGS_PAGE_SIZE,
        total: 0,
        totalPages: 1,
        rows: [],
        q: votersQ,
      };
    }
  }

  let submitters: Awaited<ReturnType<typeof listEditionBallotSubmitters>> = [];
  let voiceMembers: Awaited<
    ReturnType<typeof listMembersWithEditionVoiceFlags>
  > = [];
  if (showHostSettings) {
    try {
      submitters = await listEditionBallotSubmitters(edition.id);
    } catch {
      submitters = [];
    }
    try {
      voiceMembers = await listMembersWithEditionVoiceFlags(
        community.id,
        edition.id,
      );
    } catch {
      voiceMembers = [];
    }
  }

  const yearSettings = showHostSettings ? (
    <EditionYearSettings
      slug={community.slug}
      year={edition.year}
      status={edition.status}
      opensAt={edition.opensAt?.toISOString() ?? null}
      closesAt={edition.closesAt?.toISOString() ?? null}
      publishesAt={edition.publishesAt?.toISOString() ?? null}
      rankMode={edition.rankMode}
      submitters={submitters}
      voiceMembers={voiceMembers}
    />
  ) : null;

  let resultsBundle: {
    meta: NonNullable<Awaited<ReturnType<typeof getEditionResultsMeta>>>;
    topTen: Awaited<ReturnType<typeof getEditionGotyThroughRank>>;
    categoryPodiums: EditionCategoryStandingBlock[];
    categoryComparison: EditionCategoryComparisonMatrix;
    categoryMeta: EditionCategoryMeta[];
    voters: Awaited<ReturnType<typeof getEditionVotersPage>> & { q: string };
    matrix: EditionBallotMatrix;
    publicBallot: {
      voter: {
        profileId: string;
        displayName: string;
        username: string;
        isVoice: boolean;
      };
      items: Array<{
        gameId: string;
        title: string;
        coverUrl: string | null;
        rank: number;
      }>;
      categoryVotes: Array<{
        categoryId: string;
        title: string;
        coverUrl: string | null;
      }>;
      categories: Array<{ id: string; label: string }>;
    } | null;
  } | null = null;

  if (edition.status === "published" && !showHostSettings) {
    try {
      await ensurePublishedEditionResults(community.id, edition.year);
      const meta = await getEditionResultsMeta(edition.id);
      if (meta) {
        const emptyVoters = {
          page: 1,
          pageSize: STANDINGS_PAGE_SIZE,
          total: 0,
          totalPages: 1,
          rows: [] as Awaited<
            ReturnType<typeof getEditionVotersPage>
          >["rows"],
          q: "",
        };
        const emptyMatrix: EditionBallotMatrix = {
          showYou: false,
          hasGames: false,
          voiceColumns: [],
          rows: [],
        };
        const emptyCategoryComparison: EditionCategoryComparisonMatrix = {
          showYou: false,
          hasGames: false,
          voiceColumns: [],
          rows: [],
        };

        if (view === "standings") {
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums: [],
            categoryComparison: emptyCategoryComparison,
            categoryMeta: [],
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot: null,
          };
        } else if (view === "categories") {
          const categoryMeta = await listEditionCategoryMeta(edition.id, mode);
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums: [],
            categoryComparison: emptyCategoryComparison,
            categoryMeta,
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot: null,
          };
        } else if (view === "voters") {
          const voters = await getEditionVotersPage(edition.id, {
            page: votersPageNum,
            pageSize: STANDINGS_PAGE_SIZE,
            q: votersQ,
            voicesOnly: mode === "voices",
          });
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums: [],
            categoryComparison: emptyCategoryComparison,
            categoryMeta: [],
            voters: { ...voters, q: votersQ },
            matrix: emptyMatrix,
            publicBallot: null,
          };
        } else if (view === "ballot") {
          let publicBallot: {
            voter: {
              profileId: string;
              displayName: string;
              username: string;
              isVoice: boolean;
            };
            items: Array<{
              gameId: string;
              slug: string;
              title: string;
              coverUrl: string | null;
              rank: number;
            }>;
            categoryVotes: Array<{
              categoryId: string;
              title: string;
              coverUrl: string | null;
            }>;
            categories: Array<{ id: string; label: string }>;
          } | null = null;
          if (voterUsername) {
            const detail = await getEditionVoterDetailByUsername(
              edition.id,
              voterUsername,
            );
            if (detail) {
              publicBallot = {
                voter: detail.voter,
                items: detail.ranks.map((r) => ({
                  gameId: r.gameId,
                  slug: r.slug,
                  title: r.title,
                  coverUrl: r.coverUrl,
                  rank: r.rank,
                })),
                categoryVotes: detail.categoryPicks.map((p) => ({
                  categoryId: p.categoryId,
                  title: p.title,
                  coverUrl: p.coverUrl,
                })),
                categories: awardCategories,
              };
            }
          }
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums: [],
            categoryComparison: emptyCategoryComparison,
            categoryMeta: [],
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot,
          };
        } else {
          // Reveal + Results Ranked: top 10 + category podiums only.
          // Comparison matrices load on demand when that tertiary is selected.
          const [topTen, categoryPodiums] = await Promise.all([
            getEditionGotyThroughRank(edition.id, mode, {
              maxRank: 10,
              rankMode,
            }),
            getEditionCategoryResults(edition.id, mode, {
              maxRank: CATEGORY_RANKED_TOP,
              rankMode,
            }),
          ]);
          resultsBundle = {
            meta,
            topTen,
            categoryPodiums,
            categoryComparison: emptyCategoryComparison,
            categoryMeta: [],
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot: null,
          };
        }
      }
    } catch {
      resultsBundle = null;
    }
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage={canManage}
        editionStatus={navStatus}
        active="edition"
      />

      {edition.status === "published" && resultsBundle ? (
        <section className="mt-8">
          <EditionSectionHeader
            status={edition.status}
            slug={community.slug}
            year={edition.year}
            years={yearOptions}
            view={view}
            mode={mode}
            opensAt={edition.opensAt}
            closesAt={edition.closesAt}
            publishesAt={edition.publishesAt}
            ballotCount={ballotCount}
          />
          <EditionResultsView
            slug={community.slug}
            year={edition.year}
            communityName={community.name}
            mode={mode}
            rankMode={rankMode}
            view={view}
            meta={resultsBundle.meta}
            topTen={resultsBundle.topTen}
            categoryPodiums={resultsBundle.categoryPodiums}
            categoryComparison={resultsBundle.categoryComparison}
            categoryMeta={resultsBundle.categoryMeta}
            voters={resultsBundle.voters}
            matrix={resultsBundle.matrix}
            yourProfileId={profile?.id ?? null}
            yourBallot={
              profile && isMember
                ? {
                    items: ballot?.items ?? [],
                    categoryVotes: ballot?.categoryVotes ?? [],
                    categories: awardCategories,
                  }
                : null
            }
            publicBallot={resultsBundle.publicBallot}
            voterUsername={voterUsername || null}
            canManage={canManage}
          />
        </section>
      ) : (
        <section className="mt-8">
          <EditionSectionHeader
            status={edition.status}
            slug={community.slug}
            year={edition.year}
            years={yearOptions}
            view={view}
            mode={mode}
            opensAt={edition.opensAt}
            closesAt={edition.closesAt}
            publishesAt={edition.publishesAt}
            ballotCount={ballotCount}
          />

          {edition.status === "published" && showHostSettings ? (
            <>
              <EditionResultsViewNav
                slug={community.slug}
                year={edition.year}
                mode={mode}
                view="settings"
                hasYourBallot={Boolean(profile && isMember)}
                canManage
              />
              {yearSettings}
            </>
          ) : (
            <>
              <EditionEventTabs
                slug={community.slug}
                year={edition.year}
                canManage={canManage}
                includeVoters={showLiveVoters}
                mode={mode}
                active={
                  prePublishView === "settings"
                    ? "settings"
                    : prePublishView === "voters"
                      ? "voters"
                      : "ballot"
                }
                ballotLabel={
                  edition.status === "scheduled" ? "On the ballot" : "Ballot"
                }
              />
              {showHostSettings ? (
                yearSettings
              ) : prePublishView === "voters" && liveVoters ? (
                <div className="mt-6">
                  <EditionVotersList
                    slug={community.slug}
                    year={edition.year}
                    mode={mode}
                    voters={liveVoters}
                    yourProfileId={profile?.id ?? null}
                    revealBallots={false}
                    showBoardModes
                  />
                </div>
              ) : edition.status === "scheduled" ? (
                <EditionBallotPreview
                  year={edition.year}
                  categories={awardCategories}
                />
              ) : edition.status === "open" ? (
                !user ? (
                  <p className="mt-6 max-w-xl text-muted">
                    <Link
                      href={signInHref}
                      className="text-accent hover:underline"
                    >
                      Sign in
                    </Link>{" "}
                    and join this community to submit a ballot.
                  </p>
                ) : !profile ? (
                  <p className="mt-6 max-w-xl text-muted">
                    <Link href="/account" className="text-accent hover:underline">
                      Finish your profile
                    </Link>{" "}
                    to join this community and vote.
                  </p>
                ) : !isMember ? (
                  <div className="mt-6 max-w-xl">
                    <p className="text-muted">
                      Join this community to submit a ballot while voting is
                      open.
                    </p>
                    <MembershipActions
                      slug={community.slug}
                      isMember={false}
                      canLeave={false}
                    />
                  </div>
                ) : (
                  <EditionBallotEditor
                    slug={community.slug}
                    year={edition.year}
                    initialItems={ballot?.items ?? []}
                    initialCategoryVotes={ballot?.categoryVotes ?? []}
                    awardCategories={awardCategories}
                    siteGotyItems={siteGotyItems}
                  />
                )
              ) : !user || !profile || !isMember ? (
                <p className="mt-6 max-w-xl text-muted">
                  Voting has closed for this event.
                </p>
              ) : (
                <EditionBallotReadonly
                  items={ballot?.items ?? []}
                  categoryVotes={ballot?.categoryVotes ?? []}
                  categories={awardCategories}
                  emptyMessage="You did not submit a ballot for this event."
                />
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
