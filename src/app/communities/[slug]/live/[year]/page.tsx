import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityLiveView } from "@/components/communities/CommunityLiveView";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { CommunityPrivateView } from "@/components/communities/CommunityPrivateView";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { getCommunityLiveStandings } from "@/lib/communities/live";
import { isCommunityLiveScoresRevealed } from "@/lib/communities/live-reveal";
import { getFeaturedEditionForCommunity } from "@/lib/communities/editions";
import { canManageCommunity } from "@/lib/communities/rules";
import { communityHeaderInvitePath } from "@/lib/communities/invite-code";
import { getCommunityBySlug } from "@/lib/communities/service";
import { STANDINGS_PAGE_SIZE } from "@/lib/live-aggregate/service";
import {
  DEFAULT_LIVE_STANDINGS_VIEW,
  DEFAULT_STANDINGS_CATEGORY_GROUP,
  parseLiveStandingsView,
  parseStandingsCategoryGroup,
} from "@/lib/live-aggregate/award-category-defs";

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
    if (!community) return { title: "Live Rankings" };
    if (!Number.isFinite(year)) {
      return { title: `${community.name} Live Rankings` };
    }
    return {
      title: `${community.name} ${Math.floor(year)} Live Rankings`,
      description: `Live Game of the Year standings for ${community.name}.`,
    };
  } catch {
    return { title: "Live Rankings" };
  }
}

export default async function CommunityLiveYearPage({
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
  const pageRaw = Number(first(sp.page) ?? "1");
  const requestedPage =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const categoryGroup = parseStandingsCategoryGroup(first(sp.group));
  const view = parseLiveStandingsView(first(sp.view));
  const categoryId = first(sp.category) ?? null;

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
  if (!community.liveRankingsEnabled) notFound();

  const canManage = canManageCommunity(community.viewerRole);
  const current = new Date().getUTCFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => current - i);

  let featuredEdition = null;
  try {
    featuredEdition = await getFeaturedEditionForCommunity(community.id);
  } catch {
    featuredEdition = null;
  }
  const editionStatus =
    featuredEdition && featuredEdition.status !== "draft"
      ? featuredEdition.status
      : null;

  let standings;
  try {
    standings = await getCommunityLiveStandings(community.id, y, {
      page: requestedPage,
      pageSize: STANDINGS_PAGE_SIZE,
      scoresVisibleFrom: community.liveScoresVisibleFrom,
      locked: community.liveRankingsLocked,
      categoryGroup,
      view,
      categoryId,
    });
  } catch {
    standings = {
      year: y,
      listCount: 0,
      detailedStatsRevealed: isCommunityLiveScoresRevealed(
        community.liveScoresVisibleFrom,
      ),
      standingsVersion: 0,
      scoresFresh: true,
      page: 1,
      pageSize: STANDINGS_PAGE_SIZE,
      gotyTotal: 0,
      totalPages: 1,
      goty: [],
      categories: [],
      categoryGroup: DEFAULT_STANDINGS_CATEGORY_GROUP,
      view: DEFAULT_LIVE_STANDINGS_VIEW,
      categoryId: null,
      categoryGameTotal: 0,
    };
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled
        canManage={canManage}
        editionStatus={editionStatus}
        active="live"
        invitePath={communityHeaderInvitePath(community.viewerInviteCode)}
      />

      <CommunityLiveView
        slug={community.slug}
        communityName={community.name}
        page={standings}
        yearOptions={yearOptions}
        locked={community.liveRankingsLocked}
      />
    </main>
  );
}
