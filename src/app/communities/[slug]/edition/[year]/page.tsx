import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EditionBallotEditor,
  type EditionBallotEditorItem,
} from "@/components/communities/EditionBallotEditor";
import { EditionBallotReadonly } from "@/components/communities/EditionBallotReadonly";
import { EditionEventTabs } from "@/components/communities/EditionEventTabs";
import { EditionResultsCalculatingBanner } from "@/components/communities/EditionResultsCalculatingBanner";
import { EditionResultsEntrance } from "@/components/communities/EditionResultsEntrance";
import {
  EditionResultsView,
  EditionResultsViewNav,
} from "@/components/communities/EditionResultsView";
import { EditionVotersList } from "@/components/communities/EditionVotersList";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { communityTgaNavVisible } from "@/lib/tga-pickem/service";
import { CommunityPrivateView } from "@/components/communities/CommunityPrivateView";
import { EditionSectionHeader } from "@/components/communities/EditionSectionHeader";
import { EditionSettingsTabs } from "@/components/communities/EditionSettingsTabs";
import { EditionYearSettings } from "@/components/communities/EditionYearSettings";
import { EditionEventHostsPanel } from "@/components/communities/EditionEventHostsPanel";
import type { AwardCategoryOption } from "@/components/lists/CategoryVotesEditor";
import { EditionHostPreview } from "@/app/communities/[slug]/settings/EditionHostPreview";
import { EditionHostResultsPreview } from "@/components/communities/EditionHostResultsPreview";
import {
  editionHostPreviewHref,
} from "@/lib/communities/edition-results-href";
import { buildEditionRevealDemoStandings } from "@/lib/communities/edition-reveal-demo";
import { listActiveAwardCategories } from "@/lib/live-aggregate/categories";
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
  getEditionBallotSubmittersPage,
  getLiveEditionVotersPage,
  HOST_PREVIEW_PAGE_SIZE,
} from "@/lib/communities/ballots";
import {
  CATEGORY_RANKED_TOP,
  CATEGORY_RESULTS_PAGE_SIZE,
  ensurePublishedEditionResults,
  getEditionCategoryPage,
  getEditionCategoryResults,
  getEditionComparisonBundle,
  getEditionGotyPage,
  getEditionGotyThroughRank,
  getEditionResultsMeta,
  getEditionVotersPage,
  getEditionVoterDetailByUsername,
  listEditionCategoryMeta,
  parseEditionResultMode,
  parseEditionResultsView,
  parseEditionShowSource,
  resolveEditionHostSettings,
  type EditionBallotMatrix,
  type EditionCategoryComparisonMatrix,
  type EditionCategoryMeta,
  type EditionCategoryStandingBlock,
  type EditionCategoryStandingRow,
  type EditionGotyStandingRow,
} from "@/lib/communities/edition-results";
import {
  getEditionByCommunityYear,
  listEditionsForCommunity,
  pickFeaturedEdition,
  type CommunityEditionPublic,
} from "@/lib/communities/editions";
import { cookies } from "next/headers";
import {
  ENTRANCE_PREF_COOKIE,
  hasEditionResultsEntrancePreferenceCookie,
  isEditionResultsEntranceOpen,
} from "@/lib/communities/edition-results-entrance";
import type { EditionResultsViewId } from "@/lib/communities/edition-results-scoring";
import { editionRevealsVoterBallots, editionShowsVoterTurnout, editionUsesPublishedResultsNav, showEditionNav } from "@/lib/communities/edition-status";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";
import { communityHeaderInvitePath } from "@/lib/communities/invite-code";
import { listEditionHostRoster } from "@/lib/communities/voices";
import {
  listEditionAwardCategories,
  listEditionCategorySettings,
} from "@/lib/communities/edition-categories";
import { STANDINGS_PAGE_SIZE } from "@/lib/live-aggregate/service";
import { getOwnedGotyItemsForYear } from "@/lib/lists/service";
import { noIndexRobots } from "@/lib/seo/site";

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
    if (!community) return { title: "Event", robots: noIndexRobots };
    if (!Number.isFinite(year)) {
      return { title: `${community.name} event`, robots: noIndexRobots };
    }
    return {
      title: `${community.name} ${Math.floor(year)} event`,
      description: `${community.name} Game of the Year event.`,
      robots: noIndexRobots,
    };
  } catch {
    return { title: "Event", robots: noIndexRobots };
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
  let voterUsername = (first(sp.voter) ?? "").trim();
  const categoryId = (first(sp.category) ?? "").trim() || null;
  const categoryPageRaw = Number(first(sp.page) ?? "1");
  const categoryPageNum =
    Number.isFinite(categoryPageRaw) && categoryPageRaw >= 1
      ? Math.floor(categoryPageRaw)
      : 1;
  const previewPageRaw = Number(first(sp.previewPage) ?? "1");
  const previewPageNum =
    Number.isFinite(previewPageRaw) && previewPageRaw >= 1
      ? Math.floor(previewPageRaw)
      : 1;
  const showSource = parseEditionShowSource(first(sp.source));
  const viewParam = first(sp.view);
  const hasExplicitView =
    typeof viewParam === "string" && viewParam.length > 0;

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
  if (!community.viewerRole) {
    return <CommunityPrivateView name={community.name} />;
  }

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
  if (!editionRevealsVoterBallots(edition.status)) {
    voterUsername = "";
  }

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
    (profile && isMember && edition.status !== "scheduled") ||
    (edition.status === "published" && voterUsername.length > 0)
      ? await listEditionAwardCategories(edition.id).catch(() => [])
      : [];

  const requestedViewEarly = parseEditionResultsView(viewParam);
  const resolvedHost = resolveEditionHostSettings(
    requestedViewEarly,
    first(sp.panel),
  );
  let view: EditionResultsViewId = resolvedHost.view;
  let settingsPanel = resolvedHost.panel;

  if (edition.status === "published" && !hasExplicitView) {
    const entranceCookie = (await cookies()).get(ENTRANCE_PREF_COOKIE)?.value;
    const skipEntrance = hasEditionResultsEntrancePreferenceCookie(
      entranceCookie,
      community.slug,
      edition.year,
    );
    view =
      isEditionResultsEntranceOpen(edition.publishesAt) && !skipEntrance
        ? "entrance"
        : "overview";
    settingsPanel = "edition";
  }

  if (view === "settings" && !canManage) {
    view = "reveal";
  }
  if (view === "entrance" && edition.status !== "published") {
    view = "reveal";
  }
  if (
    settingsPanel === "preview" &&
    edition.status !== "open" &&
    edition.status !== "closed"
  ) {
    settingsPanel = "edition";
  }
  if (
    (view === "show" ||
      view === "overview" ||
      view === "comparison" ||
      view === "standings" ||
      view === "categories") &&
    !(canManage && edition.status === "closed") &&
    edition.status !== "published"
  ) {
    view = "ballot";
  }
  if (view === "show" && edition.status === "published") {
    view = "reveal";
  }
  if (
    view === "ballot" &&
    !(profile && isMember) &&
    !voterUsername
  ) {
    view = "reveal";
  }
  if (view === "category" && !categoryId) {
    view = "categories";
  }
  const showHostSettings = canManage && view === "settings";
  const showEditionSettings = showHostSettings && settingsPanel === "edition";
  const showManageHosts = showHostSettings && settingsPanel === "hosts";
  const showHostPreview =
    showHostSettings &&
    settingsPanel === "preview" &&
    (edition.status === "open" || edition.status === "closed");
  const showHostResultsPreview =
    canManage &&
    edition.status === "closed" &&
    (view === "show" ||
      view === "overview" ||
      view === "comparison" ||
      view === "standings" ||
      view === "categories");
  const showLiveVoters = editionShowsVoterTurnout(edition.status);
  const prePublishView = showHostSettings
    ? "settings"
    : showHostResultsPreview
      ? view
      : showLiveVoters && view === "voters"
        ? "voters"
        : "ballot";
  const includeSettingsPreviewTab = showLiveVoters;
  const includeRevealShowTab = canManage && edition.status === "closed";

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

  let submitters: Awaited<
    ReturnType<typeof getEditionBallotSubmittersPage>
  >["rows"] = [];
  let submittersPage = 1;
  let submittersPageSize = HOST_PREVIEW_PAGE_SIZE;
  let submittersTotal = 0;
  let submittersTotalPages = 1;
  let voiceMembers: Awaited<
    ReturnType<typeof listEditionHostRoster>
  > = [];
  let categoryOptions: Awaited<
    ReturnType<typeof listEditionCategorySettings>
  > = [];
  let siteCategoryCatalog: AwardCategoryOption[] = [];
  let hostRevealTopTen: EditionGotyStandingRow[] = [];
  let hostRevealGotyBoard: EditionGotyStandingRow[] = [];
  let hostRevealGotyTotal = 0;
  let hostRevealCategoryPodiums: EditionCategoryStandingBlock[] = [];
  let hostRevealMatrix: EditionBallotMatrix = {
    showYou: false,
    hasGames: false,
    voiceColumns: [],
    rows: [],
  };
  let hostRevealCategoryComparison: EditionCategoryComparisonMatrix = {
    showYou: false,
    hasGames: false,
    voiceColumns: [],
    rows: [],
  };
  let hostRevealLiveReady = false;

  if (showEditionSettings) {
    try {
      const [enabled, siteCats] = await Promise.all([
        listEditionCategorySettings(edition.id),
        listActiveAwardCategories(),
      ]);
      categoryOptions = enabled;
      siteCategoryCatalog = siteCats.map((c) => ({
        id: c.id,
        label: c.label,
        description: c.description,
        sortOrder: c.sortOrder,
        categoryGroup: c.categoryGroup,
        eligibility: c.eligibility,
        allowEditions: c.allowEditions,
      }));
    } catch {
      categoryOptions = [];
      siteCategoryCatalog = [];
    }
  }
  if (showManageHosts) {
    try {
      voiceMembers = await listEditionHostRoster(
        community.id,
        edition.id,
      );
    } catch {
      voiceMembers = [];
    }
  }
  if (showHostPreview) {
    try {
      const preview = await getEditionBallotSubmittersPage(edition.id, {
        page: previewPageNum,
        pageSize: HOST_PREVIEW_PAGE_SIZE,
      });
      submitters = preview.rows;
      submittersPage = preview.page;
      submittersPageSize = preview.pageSize;
      submittersTotal = preview.total;
      submittersTotalPages = preview.totalPages;
    } catch {
      submitters = [];
    }
  }
  if (showHostResultsPreview) {
    const loadComparison = view === "comparison";
    if (showSource === "live") {
      try {
        const meta = await getEditionResultsMeta(edition.id);
        if (meta) {
          if (loadComparison) {
            const comparison = await getEditionComparisonBundle(edition.id, {
              viewerProfileId: profile?.id ?? null,
              rankMode: edition.rankMode,
            });
            hostRevealMatrix = comparison.matrix;
            hostRevealCategoryComparison = comparison.categoryComparison;
            hostRevealLiveReady = true;
          } else {
            const [topTen, categoryPodiums, gotyPage] = await Promise.all([
              getEditionGotyThroughRank(edition.id, "community", {
                maxRank: 10,
                rankMode: edition.rankMode,
              }),
              getEditionCategoryResults(edition.id, "community", {
                maxRank: CATEGORY_RANKED_TOP,
                rankMode: edition.rankMode,
              }),
              getEditionGotyPage(edition.id, "community", {
                page: 1,
                pageSize: STANDINGS_PAGE_SIZE,
                rankMode: edition.rankMode,
              }),
            ]);
            hostRevealTopTen = topTen;
            hostRevealCategoryPodiums = categoryPodiums;
            hostRevealGotyBoard = gotyPage.rows;
            hostRevealGotyTotal = gotyPage.total;
            hostRevealLiveReady = true;
          }
        }
      } catch {
        hostRevealLiveReady = false;
      }
    } else {
      try {
        const cats = await listEditionAwardCategories(edition.id);
        const demo = buildEditionRevealDemoStandings(
          cats.map((c) => ({
            id: c.id,
            label: c.label,
            description: c.description,
          })),
        );
        hostRevealTopTen = demo.topTen;
        hostRevealGotyBoard = demo.gotyBoard;
        hostRevealGotyTotal = demo.gotyBoard.length;
        hostRevealCategoryPodiums = demo.categoryPodiums;
        if (loadComparison) {
          hostRevealMatrix = demo.matrix;
          hostRevealCategoryComparison = demo.categoryComparison;
        }
      } catch {
        const demo = buildEditionRevealDemoStandings([]);
        hostRevealTopTen = demo.topTen;
        hostRevealGotyBoard = demo.gotyBoard;
        hostRevealGotyTotal = demo.gotyBoard.length;
        hostRevealCategoryPodiums = demo.categoryPodiums;
        if (loadComparison) {
          hostRevealMatrix = demo.matrix;
          hostRevealCategoryComparison = demo.categoryComparison;
        }
      }
    }
  }

  const hostToolPanel = showHostSettings ? (
    <div>
      <EditionSettingsTabs
        slug={community.slug}
        year={edition.year}
        active={settingsPanel}
        includePreview={includeSettingsPreviewTab}
      />
      {showEditionSettings ? (
        <div className="mt-6">
          <EditionYearSettings
            slug={community.slug}
            year={edition.year}
            status={edition.status}
            opensAt={edition.opensAt?.toISOString() ?? null}
            closesAt={edition.closesAt?.toISOString() ?? null}
            publishesAt={edition.publishesAt?.toISOString() ?? null}
            rankMode={edition.rankMode}
            categoryOptions={categoryOptions}
            siteCategoryCatalog={siteCategoryCatalog}
          />
        </div>
      ) : showManageHosts ? (
        <EditionEventHostsPanel
          slug={community.slug}
          year={edition.year}
          status={edition.status}
          voiceMembers={voiceMembers}
        />
      ) : showHostPreview ? (
        <div className="mt-6">
          <EditionHostPreview
            status={edition.status}
            submitters={submitters}
            page={submittersPage}
            pageSize={submittersPageSize}
            total={submittersTotal}
            totalPages={submittersTotalPages}
            pageHref={(previewPage) =>
              editionHostPreviewHref(community.slug, edition.year, {
                previewPage,
              })
            }
          />
        </div>
      ) : null}
    </div>
  ) : null;

  let resultsBundle: {
    meta: NonNullable<Awaited<ReturnType<typeof getEditionResultsMeta>>>;
    topTen: Awaited<ReturnType<typeof getEditionGotyThroughRank>>;
    categoryPodiums: EditionCategoryStandingBlock[];
    categoryComparison: EditionCategoryComparisonMatrix;
    categoryMeta: EditionCategoryMeta[];
    categoryPage: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      rows: EditionCategoryStandingRow[];
    } | null;
    voters: Awaited<ReturnType<typeof getEditionVotersPage>> & { q: string };
    matrix: EditionBallotMatrix;
    publicBallot: {
      voter: {
        profileId: string;
        displayName: string;
        username: string;
        avatarUrl: string | null;
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
    standingsPage: Awaited<ReturnType<typeof getEditionGotyPage>> | null;
  } | null = null;

  let entranceFreezeReady = false;
  if (edition.status === "published" && view === "entrance" && !showHostSettings) {
    try {
      await ensurePublishedEditionResults(community.id, edition.year);
      const meta = await getEditionResultsMeta(edition.id);
      entranceFreezeReady = meta != null || edition.freezeStatus === "ready";
    } catch {
      entranceFreezeReady = false;
    }
  }

  if (edition.status === "published" && !showHostSettings && view !== "entrance") {
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
          const standingsPage = await getEditionGotyPage(edition.id, mode, {
            page: categoryPageNum,
            pageSize: STANDINGS_PAGE_SIZE,
            rankMode,
          });
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums: [],
            categoryComparison: emptyCategoryComparison,
            categoryMeta: [],
            categoryPage: null,
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot: null,
            standingsPage,
          };
        } else if (view === "categories" || view === "category") {
          const categoryMeta = await listEditionCategoryMeta(edition.id, mode);
          const categoryPage =
            view === "category" && categoryId
              ? await getEditionCategoryPage(edition.id, mode, categoryId, {
                  page: categoryPageNum,
                  pageSize: CATEGORY_RESULTS_PAGE_SIZE,
                  rankMode,
                })
              : null;
          resultsBundle = {
            meta,
            topTen: [],
            categoryPodiums:
              view === "categories"
                ? await getEditionCategoryResults(edition.id, mode, {
                    maxRank: CATEGORY_RANKED_TOP,
                    rankMode,
                  })
                : [],
            categoryComparison: emptyCategoryComparison,
            categoryMeta,
            categoryPage,
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot: null,
            standingsPage: null,
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
            categoryPage: null,
            voters: { ...voters, q: votersQ },
            matrix: emptyMatrix,
            publicBallot: null,
            standingsPage: null,
          };
        } else if (view === "ballot") {
          let publicBallot: {
            voter: {
              profileId: string;
              displayName: string;
              username: string;
              avatarUrl: string | null;
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
            categoryPage: null,
            voters: emptyVoters,
            matrix: emptyMatrix,
            publicBallot,
            standingsPage: null,
          };
        } else {
          // Reveal + Results Ranked: top 10 + category podiums only.
          // Comparison (`?view=comparison`) SSR-loads matrices on this route.
          if (view === "comparison") {
            const comparison = await getEditionComparisonBundle(edition.id, {
              viewerProfileId: profile?.id ?? null,
              rankMode,
            });
            resultsBundle = {
              meta,
              topTen: [],
              categoryPodiums: [],
              categoryComparison: comparison.categoryComparison,
              categoryMeta: [],
              categoryPage: null,
              voters: emptyVoters,
              matrix: comparison.matrix,
              publicBallot: null,
              standingsPage: null,
            };
          } else {
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
              categoryPage: null,
              voters: emptyVoters,
              matrix: emptyMatrix,
              publicBallot: null,
              standingsPage: null,
            };
          }
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
        editionYear={featured?.year ?? edition.year}
        communityId={community.id}
        tgaEnabled={await communityTgaNavVisible(community.id).catch(() => false)}
        active="edition"
        invitePath={communityHeaderInvitePath(community.viewerInviteCode)}
        avatarUrl={community.avatarUrl}
        bannerUrl={community.bannerUrl}
        socialLinks={community.socialLinks}
      />

      {edition.status === "published" && view === "entrance" ? (
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
          {entranceFreezeReady ? (
            <EditionResultsEntrance
              slug={community.slug}
              year={edition.year}
              communityName={community.name}
              mode={mode}
            />
          ) : (
            <EditionResultsCalculatingBanner status={edition.freezeStatus} />
          )}
        </section>
      ) : edition.status === "published" && resultsBundle ? (
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
            categoryId={categoryId}
            meta={resultsBundle.meta}
            topTen={resultsBundle.topTen}
            categoryPodiums={resultsBundle.categoryPodiums}
            categoryComparison={resultsBundle.categoryComparison}
            categoryMeta={resultsBundle.categoryMeta}
            categoryPage={resultsBundle.categoryPage}
            standingsPage={resultsBundle.standingsPage}
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
      ) : edition.status === "published" && !showHostSettings ? (
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
          <EditionResultsCalculatingBanner status={edition.freezeStatus} />
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

          {edition.status === "closed" &&
          (edition.freezeStatus === "pending" ||
            edition.freezeStatus === "computing" ||
            edition.freezeStatus === "failed") ? (
            <EditionResultsCalculatingBanner status={edition.freezeStatus} />
          ) : null}

          {editionUsesPublishedResultsNav(edition.status) && showHostSettings ? (
            <>
              <EditionResultsViewNav
                slug={community.slug}
                year={edition.year}
                mode={mode}
                view="settings"
                hasYourBallot={Boolean(profile && isMember)}
                canManage
              />
              {hostToolPanel}
            </>
          ) : (
            <>
              <EditionEventTabs
                slug={community.slug}
                year={edition.year}
                canManage={canManage}
                includeBallot={
                  edition.status === "open" || edition.status === "closed"
                }
                includeVoters={showLiveVoters}
                includeRevealShow={includeRevealShowTab}
                mode={mode}
                active={
                  prePublishView === "settings"
                    ? "settings"
                    : showHostResultsPreview
                      ? "show"
                      : prePublishView === "voters"
                        ? "voters"
                        : "ballot"
                }
              />
              {showHostSettings ? (
                hostToolPanel
              ) : showHostResultsPreview ? (
                <EditionHostResultsPreview
                  slug={community.slug}
                  year={edition.year}
                  communityName={community.name}
                  source={showSource}
                  previewView={
                    view === "overview" ||
                    view === "comparison" ||
                    view === "standings" ||
                    view === "categories"
                      ? view
                      : "show"
                  }
                  topTen={hostRevealTopTen}
                  gotyBoard={hostRevealGotyBoard}
                  gotyTotal={hostRevealGotyTotal}
                  categoryPodiums={hostRevealCategoryPodiums}
                  matrix={hostRevealMatrix}
                  categoryComparison={hostRevealCategoryComparison}
                  freezeStatus={edition.freezeStatus}
                  liveReady={hostRevealLiveReady}
                />
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
              ) : edition.status === "scheduled" ? null : edition.status === "open" ? (
                !user ? (
                  <p className="mt-6 max-w-xl text-muted">
                    <Link
                      href={signInHref}
                      rel="nofollow"
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
                  <p className="mt-6 max-w-xl text-muted">
                    You need an invite to join this community and vote.
                  </p>
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
