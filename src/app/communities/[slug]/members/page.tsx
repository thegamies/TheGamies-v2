import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { CommunityHeader } from "@/components/communities/CommunityHeader";
import { CommunityPrivateView } from "@/components/communities/CommunityPrivateView";
import { canManageCommunity } from "@/lib/communities/rules";
import { getFeaturedEditionForCommunity } from "@/lib/communities/editions";
import { communityHeaderInvitePath } from "@/lib/communities/invite-code";
import { MemberAdminActions } from "@/app/communities/[slug]/settings/MemberAdminActions";
import {
  COMMUNITY_MEMBERS_PAGE_SIZE,
  getCommunityBySlug,
  listCommunityMembersPage,
} from "@/lib/communities/service";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function membersHref(slug: string, page: number, q?: string): string {
  const base = `/communities/${encodeURIComponent(slug)}/members`;
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const community = await getCommunityBySlug(slug);
    if (!community) return { title: "Members" };
    return {
      title: `${community.name} members`,
      description: `People in ${community.name}.`,
    };
  } catch {
    return { title: "Members" };
  }
}

export default async function CommunityMembersPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const pageRaw = Number(first(sp.page) ?? "1");
  const q = (first(sp.q) ?? "").trim();

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
  const publicEdition =
    featuredEdition && featuredEdition.status !== "draft"
      ? featuredEdition
      : null;

  let membersPage;
  try {
    membersPage = await listCommunityMembersPage(community.id, pageRaw, { q });
  } catch {
    membersPage = {
      members: [],
      page: 1,
      pageSize: COMMUNITY_MEMBERS_PAGE_SIZE,
      total: community.memberCount,
      totalPages: 1,
    };
  }

  const from =
    membersPage.total === 0
      ? 0
      : (membersPage.page - 1) * membersPage.pageSize + 1;
  const to = Math.min(
    membersPage.page * membersPage.pageSize,
    membersPage.total,
  );
  const showPager = membersPage.total > membersPage.pageSize;

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pt-0 pb-10">
      <CommunityHeader
        name={community.name}
        slug={community.slug}
        liveEnabled={community.liveRankingsEnabled}
        canManage={canManage}
        editionStatus={publicEdition?.status ?? null}
        active="members"
        invitePath={communityHeaderInvitePath(community.viewerInviteCode)}
        avatarUrl={community.avatarUrl}
        bannerUrl={community.bannerUrl}
        socialLinks={community.socialLinks}
      />

      <section className="mt-10">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Members
        </h2>
        <p className="mt-3 text-sm text-muted">
          {community.memberCount}{" "}
          {community.memberCount === 1 ? "member" : "members"}
        </p>

        <form className="mt-6 flex flex-wrap gap-2" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search members"
            className="border border-line bg-paper px-3 py-2 text-sm text-ink"
            aria-label="Search members"
          />
          <button
            type="submit"
            className="border border-line px-3 py-2 text-sm text-ink hover:border-accent"
          >
            Search
          </button>
        </form>

        {membersPage.members.length === 0 ? (
          <p className="mt-8 text-muted">
            {q ? "No members match that search." : "No members yet."}
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {membersPage.members.map((member) => (
              <li
                key={member.profileId}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <Link
                    href={`/u/${member.username}`}
                    className="text-ink hover:text-accent"
                  >
                    {member.displayName}
                  </Link>
                  <p className="text-sm text-muted">@{member.username}</p>
                </div>
                {canManage && profile ? (
                  <MemberAdminActions
                    slug={community.slug}
                    profileId={member.profileId}
                    displayName={member.displayName}
                    isYou={member.profileId === profile.id}
                    isLastAdmin={
                      member.role === "admin" && community.hostCount <= 1
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {showPager ? (
          <nav
            className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm"
            aria-label="Member pages"
          >
            <p className="text-muted">
              {from}–{to} of {membersPage.total} · page {membersPage.page} of{" "}
              {membersPage.totalPages}
            </p>
            <div className="flex gap-2">
              {membersPage.page > 1 ? (
                <Link
                  href={membersHref(community.slug, membersPage.page - 1, q)}
                  className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
                >
                  Previous
                </Link>
              ) : null}
              {membersPage.page < membersPage.totalPages ? (
                <Link
                  href={membersHref(community.slug, membersPage.page + 1, q)}
                  className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
