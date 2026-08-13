import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { canManageCommunity, leaveBlockedReason } from "@/lib/communities/rules";
import {
  getFeaturedEditionForCommunity,
} from "@/lib/communities/editions";
import { editionOverviewLinkLabel } from "@/lib/communities/edition-status";
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

  const adminCount = community.members.filter((m) => m.role === "admin").length;
  const canLeave =
    community.viewerRole != null &&
    leaveBlockedReason(community.viewerRole, adminCount) == null;
  const canManage = canManageCommunity(community.viewerRole);
  const signInHref = `/auth/sign-in?next=/communities/${encodeURIComponent(community.slug)}`;

  let featuredEdition = null;
  try {
    featuredEdition = await getFeaturedEditionForCommunity(community.id);
  } catch {
    featuredEdition = null;
  }
  const publicEdition =
    featuredEdition && featuredEdition.status !== "draft"
      ? featuredEdition
      : null;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage={canManage}
        editionStatus={publicEdition?.status ?? null}
        active="overview"
      />

      <p className="mt-8 text-sm text-muted">
        {community.memberCount}{" "}
        {community.memberCount === 1 ? "member" : "members"}
      </p>
      {community.description ? (
        <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-muted">
          {community.description}
        </p>
      ) : null}
      {publicEdition ? (
        <p className="mt-4 text-sm text-ink" role="status">
          <Link
            href={`/communities/${community.slug}/edition/${publicEdition.year}`}
            className="hover:text-accent"
          >
            {editionOverviewLinkLabel(
              publicEdition.year,
              publicEdition.status,
            )}
          </Link>
        </p>
      ) : null}

      {profile ? (
        <MembershipActions
          slug={community.slug}
          isMember={community.viewerRole != null}
          canLeave={canLeave}
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

      <section className="mt-14 border-t border-line pt-8">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Members
        </h2>
        {community.members.length === 0 ? (
          <p className="mt-4 text-muted">No members yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {community.members.map((member) => (
              <li key={member.profileId} className="py-4">
                <Link
                  href={`/u/${member.username}`}
                  className="text-ink hover:text-accent"
                >
                  {member.displayName}
                </Link>
                <p className="text-sm text-muted">@{member.username}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
