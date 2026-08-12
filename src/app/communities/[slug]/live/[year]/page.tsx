import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityLiveView } from "@/components/communities/CommunityLiveView";
import { CommunityNav } from "@/components/communities/CommunityNav";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { getCommunityLiveStandings } from "@/lib/communities/live";
import { isCommunityLiveScoresRevealed } from "@/lib/communities/live-reveal";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";
import { STANDINGS_PAGE_SIZE } from "@/lib/live-aggregate/service";

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
    if (!community) return { title: "Live standings" };
    if (!Number.isFinite(year)) {
      return { title: `${community.name} live standings` };
    }
    return {
      title: `${community.name} ${Math.floor(year)} live standings`,
      description: `Live Game of the Year standings for ${community.name}.`,
    };
  } catch {
    return { title: "Live standings" };
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
  if (!community.liveRankingsEnabled) notFound();

  const canManage = canManageCommunity(community.viewerRole);
  const current = new Date().getUTCFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => current - i);

  let standings;
  try {
    standings = await getCommunityLiveStandings(community.id, y, {
      page: requestedPage,
      pageSize: STANDINGS_PAGE_SIZE,
      scoresVisibleFrom: community.liveScoresVisibleFrom,
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
    };
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/communities" className="hover:text-ink">
          Communities
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        {community.name}
      </h1>

      <CommunityNav
        slug={community.slug}
        liveEnabled
        canManage={canManage}
        active="live"
      />

      <CommunityLiveView
        slug={community.slug}
        communityName={community.name}
        page={standings}
        yearOptions={yearOptions}
      />
    </main>
  );
}
