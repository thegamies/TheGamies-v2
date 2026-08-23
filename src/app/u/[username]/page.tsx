import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityListCard } from "@/components/communities/CommunityListCard";
import { ProfileListPreviewCard } from "@/components/profile/ProfileListPreviewCard";
import { ProfilePager } from "@/components/profile/ProfilePager";
import { ProfileSocialLinks } from "@/components/profile/ProfileSocialLinks";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { MastheadBanner } from "@/components/ui/MastheadBanner";
import { getRequestSessionUser } from "@/lib/auth/session";
import { listCommunitiesForProfilePage } from "@/lib/communities/service";
import { listOwnedForProfilePage } from "@/lib/lists/service";
import {
  parseProfilePage,
  parseProfileTab,
  profileHref,
  PROFILE_COMMUNITIES_PAGE_SIZE,
  PROFILE_LISTS_PAGE_SIZE,
} from "@/lib/profile/profile-page";
import {
  getProfileByUsername,
  ownsProfile,
} from "@/lib/profile/service";

type Params = Promise<{ username: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username).catch(() => null);
  if (!profile || profile.visibility === "private") {
    return { title: "Profile" };
  }
  return {
    title: profile.displayName,
    description: profile.bio ?? `${profile.displayName} on The Gamies`,
  };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username).catch(() => null);
  if (!profile) {
    notFound();
  }

  const sessionUser = await getRequestSessionUser();
  const isOwner = ownsProfile(profile, sessionUser?.id);

  if (profile.visibility === "private" && !isOwner) {
    notFound();
  }

  const sp = await searchParams;
  const tab = parseProfileTab(first(sp.tab));
  const pageRaw = parseProfilePage(first(sp.page));

  return (
    <>
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] pb-10 pt-0">
        {profile.bannerUrl ? (
          <div className="-mx-[var(--gutter)]">
            <MastheadBanner src={profile.bannerUrl} fadeTo="paper" />
          </div>
        ) : null}
        <div
          className={`relative z-[1] ${
            profile.bannerUrl ? "-mt-14 pt-2 sm:-mt-16" : "pt-[var(--page-pad-y)]"
          }`}
        >
          <div className="flex items-start gap-5">
            <UserAvatar
              displayName={profile.displayName}
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              size={96}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                @{profile.username}
              </p>
              <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
                {profile.displayName}
              </h1>
              {profile.visibility === "private" && isOwner ? (
                <p className="mt-2 text-sm text-muted">
                  This profile is private — only you can see it here.
                </p>
              ) : null}
              <ProfileSocialLinks value={profile.socialLinks} />
            </div>
          </div>
          {profile.bio ? (
            <p className="mt-6 max-w-2xl text-lg text-muted">{profile.bio}</p>
          ) : (
            <p className="mt-6 text-muted">No bio yet.</p>
          )}

          <ProfileTabs username={profile.username} tab={tab} />

          {tab === "communities" ? (
            <ProfileCommunities
              profileId={profile.id}
              username={profile.username}
              pageRaw={pageRaw}
            />
          ) : (
            <ProfileLists
              profileId={profile.id}
              username={profile.username}
              pageRaw={pageRaw}
            />
          )}
        </div>
      </main>
    </>
  );
}

async function ProfileLists({
  profileId,
  username,
  pageRaw,
}: {
  profileId: string;
  username: string;
  pageRaw: number;
}) {
  const result = await listOwnedForProfilePage(profileId, pageRaw).catch(
    () => null,
  );
  const listsPage = result ?? {
    lists: [],
    page: 1,
    pageSize: PROFILE_LISTS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  if (listsPage.total === 0) {
    return <p className="mt-6 text-muted">No lists yet.</p>;
  }

  const from = (listsPage.page - 1) * listsPage.pageSize + 1;
  const to = Math.min(listsPage.page * listsPage.pageSize, listsPage.total);

  return (
    <div className="mt-8 space-y-10">
      {listsPage.lists.map((list) => (
        <ProfileListPreviewCard
          key={list.publicId}
          username={username}
          list={list}
        />
      ))}
      <ProfilePager
        label="List pages"
        from={from}
        to={to}
        total={listsPage.total}
        page={listsPage.page}
        totalPages={listsPage.totalPages}
        prevHref={
          listsPage.page > 1
            ? profileHref(username, {
                tab: "lists",
                page: listsPage.page - 1,
              })
            : null
        }
        nextHref={
          listsPage.page < listsPage.totalPages
            ? profileHref(username, {
                tab: "lists",
                page: listsPage.page + 1,
              })
            : null
        }
      />
    </div>
  );
}

async function ProfileCommunities({
  profileId,
  username,
  pageRaw,
}: {
  profileId: string;
  username: string;
  pageRaw: number;
}) {
  const result = await listCommunitiesForProfilePage(profileId, pageRaw).catch(
    () => null,
  );
  const memberships = result ?? {
    communities: [],
    page: 1,
    pageSize: PROFILE_COMMUNITIES_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  if (memberships.total === 0) {
    return <p className="mt-6 text-muted">No communities yet.</p>;
  }

  const from = (memberships.page - 1) * memberships.pageSize + 1;
  const to = Math.min(
    memberships.page * memberships.pageSize,
    memberships.total,
  );

  return (
    <div className="mt-6">
      <ul className="grid gap-x-6 gap-y-5 border-y border-line py-4 sm:grid-cols-2">
        {memberships.communities.map((community) => (
          <CommunityListCard
            key={community.id}
            slug={community.slug}
            name={community.name}
            description={community.description}
            avatarUrl={community.avatarUrl}
            bannerUrl={community.bannerUrl}
            memberCount={community.memberCount}
          />
        ))}
      </ul>
      <ProfilePager
        label="Community pages"
        from={from}
        to={to}
        total={memberships.total}
        page={memberships.page}
        totalPages={memberships.totalPages}
        prevHref={
          memberships.page > 1
            ? profileHref(username, {
                tab: "communities",
                page: memberships.page - 1,
              })
            : null
        }
        nextHref={
          memberships.page < memberships.totalPages
            ? profileHref(username, {
                tab: "communities",
                page: memberships.page + 1,
              })
            : null
        }
      />
    </div>
  );
}
