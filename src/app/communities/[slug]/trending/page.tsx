import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrendingBoard } from "@/components/activity/TrendingBoard";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { CommunityPrivateView } from "@/components/communities/CommunityPrivateView";
import { listTrendingBoard } from "@/lib/activity/query";
import { parseTrendingWindowHours } from "@/lib/activity/trending";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { getFeaturedEditionForCommunity } from "@/lib/communities/editions";
import { communityHeaderInvitePath } from "@/lib/communities/invite-code";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";
import { communityTgaNavVisible } from "@/lib/tga-pickem/service";
import { noIndexRobots } from "@/lib/seo/site";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const community = await getCommunityBySlug(slug);
    if (!community) return { title: "Trending", robots: noIndexRobots };
    return {
      title: `${community.name} Trending`,
      description: `Games moving among members of ${community.name}.`,
      robots: noIndexRobots,
    };
  } catch {
    return { title: "Trending", robots: noIndexRobots };
  }
}

export default async function CommunityTrendingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const hours = parseTrendingWindowHours(
    first((await searchParams).hours),
  );

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

  const canManage = canManageCommunity(community.viewerRole);
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

  const board = await listTrendingBoard({
    windowHours: hours,
    communityId: community.id,
    applySiteFloor: false,
  }).catch(() => ({
    rows: [],
    windowHours: hours,
    publicReady: true,
    distinctPeople: 0,
  }));

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage={canManage}
        editionStatus={editionStatus}
        editionYear={
          featuredEdition && featuredEdition.status !== "draft"
            ? featuredEdition.year
            : null
        }
        communityId={community.id}
        tgaEnabled={await communityTgaNavVisible(community.id).catch(() => false)}
        active="trending"
        invitePath={communityHeaderInvitePath(community.viewerInviteCode)}
        avatarUrl={community.avatarUrl}
        bannerUrl={community.bannerUrl}
        socialLinks={community.socialLinks}
      />

      <h2 className="mt-10 font-display text-4xl tracking-wide text-ink">
        Trending
      </h2>
      <p className="mt-3 max-w-2xl text-muted">
        Games members are playing, finishing, and ranking right now.
      </p>
      <TrendingBoard
        rows={board.rows}
        hours={board.windowHours}
        communitySlug={community.slug}
        empty="No games are moving among members in this window."
      />
    </main>
  );
}
