import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { CommunityEventsOverview } from "@/components/communities/CommunityEventsOverview";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { SectionRule } from "@/components/ui/SectionRule";
import { canManageCommunity, leaveBlockedReason } from "@/lib/communities/rules";
import {
  listEditionsForCommunity,
  pickFeaturedEdition,
  pickOverviewEditions,
  type CommunityEditionPublic,
} from "@/lib/communities/editions";
import { EDITION_PUBLIC_LABEL } from "@/lib/communities/edition-status";
import { communityCreateEventHref } from "@/lib/communities/community-settings-href";
import { getCommunityBySlug } from "@/lib/communities/service";
import { MembershipActions } from "./MembershipActions";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const community = await getCommunityBySlug(slug);
    if (!community) return { title: "Community" };
    return {
      title: community.name,
      description:
        community.description || `${community.name} on The Gamies`,
    };
  } catch {
    return { title: "Community" };
  }
}

export default async function CommunityHomePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
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

  const canLeave =
    community.viewerRole != null &&
    leaveBlockedReason(community.viewerRole, community.hostCount) == null;
  const canManage = canManageCommunity(community.viewerRole);
  const signInHref = `/auth/sign-in?next=/communities/${encodeURIComponent(community.slug)}`;
  const membersHref = `/communities/${encodeURIComponent(community.slug)}/members`;

  let editions: CommunityEditionPublic[] = [];
  try {
    editions = await listEditionsForCommunity(community.id);
  } catch {
    editions = [];
  }
  const featuredEdition = pickFeaturedEdition(editions);
  const overviewEditions = pickOverviewEditions(editions, 3);
  const navEditionStatus =
    featuredEdition && featuredEdition.status !== "draft"
      ? featuredEdition.status
      : (overviewEditions[0]?.status ?? null);
  const showCreateEvent = canManage && editions.length === 0;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage={canManage}
        editionStatus={navEditionStatus}
        active="overview"
      />

      {overviewEditions.length > 0 ? (
        <div className="mt-10">
          <CommunityEventsOverview
            slug={community.slug}
            editions={overviewEditions}
          />
        </div>
      ) : showCreateEvent ? (
        <section className="mt-10">
          <h2 className="font-display text-3xl tracking-wide text-ink">
            {EDITION_PUBLIC_LABEL}
          </h2>
          <p className="mt-4 max-w-xl text-sm text-muted">
            Create an event to open a yearly awards vote.
          </p>
          <p className="mt-6">
            <Link
              href={communityCreateEventHref(community.slug)}
              className="inline-flex items-center justify-center rounded-[var(--radius-control)] border border-line px-4 py-2 text-sm font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
            >
              Create event
            </Link>
          </p>
        </section>
      ) : null}

      {overviewEditions.length > 0 || showCreateEvent ? (
        <SectionRule className="mt-10 mb-8" />
      ) : null}

      <section
        className={
          overviewEditions.length > 0 || showCreateEvent ? "" : "mt-10"
        }
      >
        <h2 className="font-display text-3xl tracking-wide text-ink">About</h2>
        {community.description ? (
          <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-muted">
            {community.description}
          </p>
        ) : null}
        <p className="mt-4 text-sm text-muted">
          <Link href={membersHref} className="hover:text-ink">
            {community.memberCount}{" "}
            {community.memberCount === 1 ? "member" : "members"}
          </Link>
        </p>
        {profile ? (
          <MembershipActions
            slug={community.slug}
            isMember={community.viewerRole != null}
            canLeave={canLeave}
            isHost={canManage}
          />
        ) : user ? (
          <p className="mt-6 text-sm text-muted">
            <Link href="/account" className="text-accent hover:underline">
              Finish your profile
            </Link>{" "}
            to join this community.
          </p>
        ) : (
          <p className="mt-6 text-sm text-muted">
            <Link href={signInHref} className="text-accent hover:underline">
              Sign in
            </Link>{" "}
            to join this community.
          </p>
        )}
      </section>
    </main>
  );
}
