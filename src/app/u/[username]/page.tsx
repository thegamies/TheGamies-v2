import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityListCard } from "@/components/communities/CommunityListCard";
import { FollowButton } from "@/components/follow/FollowButton";
import { FollowCounts } from "@/components/follow/FollowCounts";
import { FollowRosterList } from "@/components/follow/FollowRosterList";
import { LibraryShelf } from "@/components/library/LibraryShelf";
import { ProfileListPreviewCard } from "@/components/profile/ProfileListPreviewCard";
import { ProfilePager } from "@/components/profile/ProfilePager";
import { ProfileSocialLinks } from "@/components/profile/ProfileSocialLinks";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { MastheadBanner } from "@/components/ui/MastheadBanner";
import { getRequestSessionUser } from "@/lib/auth/session";
import { listCommunitiesForProfilePage } from "@/lib/communities/service";
import {
  FOLLOW_ROSTER_PAGE_SIZE,
  followCounts,
  isFollowing,
  listFollowersPage,
  listFollowingPage,
} from "@/lib/follow/service";
import { allowFollowSeedAccounts } from "@/lib/follow/rules";
import {
  PROFILE_LIBRARY_PAGE_SIZE,
  listLibraryForProfilePage,
} from "@/lib/library/service";
import { listOwnedForProfilePage } from "@/lib/lists/service";
import {
  parseProfilePage,
  parseProfileTab,
  profileHref,
  PROFILE_COMMUNITIES_PAGE_SIZE,
  PROFILE_LISTS_PAGE_SIZE,
} from "@/lib/profile/profile-page";
import {
  getProfileByAuthUserId,
  getProfileByUsername,
  ownsProfile,
} from "@/lib/profile/service";
import { ogImagePath } from "@/lib/seo/og-path";
import { shouldIndexProfile } from "@/lib/seo/sitemap-plan";
import { noIndexRobots, publicPageMetadata } from "@/lib/seo/site";

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
  if (!profile || !shouldIndexProfile(profile)) {
    return { title: "Profile", robots: noIndexRobots };
  }
  return publicPageMetadata({
    title: profile.displayName,
    description: profile.bio ?? `${profile.displayName} on The Gamies`,
    path: `/u/${profile.username}`,
    image: ogImagePath({ kind: "profile", username: profile.username }),
  });
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
  const viewerProfile = sessionUser?.id
    ? await getProfileByAuthUserId(sessionUser.id).catch(() => null)
    : null;
  const isOwner = ownsProfile(profile, sessionUser?.id);

  if (profile.visibility === "private" && !isOwner) {
    notFound();
  }

  const sp = await searchParams;
  const tab = parseProfileTab(first(sp.tab));
  const pageRaw = parseProfilePage(first(sp.page));
  const counts = await followCounts(profile.id).catch(() => ({
    following: 0,
    followers: 0,
  }));
  const canFollowSeed = allowFollowSeedAccounts({
    isSiteAdmin: viewerProfile?.isSiteAdmin,
  });
  const canFollowProfile =
    Boolean(viewerProfile) &&
    !isOwner &&
    profile.visibility === "public" &&
    (!profile.isSeed || canFollowSeed);
  const viewerFollowing = canFollowProfile
    ? await isFollowing(viewerProfile!.id, profile.id).catch(() => false)
    : false;

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
              {profile.visibility === "public" || isOwner ? (
                <FollowCounts
                  username={profile.username}
                  following={counts.following}
                  followers={counts.followers}
                />
              ) : null}
              {canFollowProfile ? (
                <FollowButton
                  username={profile.username}
                  initialFollowing={viewerFollowing}
                />
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
              isOwner={isOwner}
            />
          ) : tab === "library" ? (
            <ProfileLibrary
              profileId={profile.id}
              username={profile.username}
              pageRaw={pageRaw}
              isOwner={isOwner}
            />
          ) : tab === "following" ? (
            <ProfileFollowRoster
              profileId={profile.id}
              username={profile.username}
              pageRaw={pageRaw}
              direction="following"
              isOwner={isOwner}
            />
          ) : tab === "followers" ? (
            <ProfileFollowRoster
              profileId={profile.id}
              username={profile.username}
              pageRaw={pageRaw}
              direction="followers"
              isOwner={isOwner}
            />
          ) : (
            <ProfileLists
              profileId={profile.id}
              username={profile.username}
              pageRaw={pageRaw}
              isOwner={isOwner}
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
  isOwner,
}: {
  profileId: string;
  username: string;
  pageRaw: number;
  isOwner: boolean;
}) {
  const result = await listOwnedForProfilePage(profileId, pageRaw, {
    includeHidden: isOwner,
  }).catch(
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
  isOwner,
}: {
  profileId: string;
  username: string;
  pageRaw: number;
  isOwner: boolean;
}) {
  const result = await listCommunitiesForProfilePage(profileId, pageRaw, {
    includePrivate: isOwner,
  }).catch(
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

async function ProfileLibrary({
  profileId,
  username,
  pageRaw,
  isOwner,
}: {
  profileId: string;
  username: string;
  pageRaw: number;
  isOwner: boolean;
}) {
  const result = await listLibraryForProfilePage(profileId, pageRaw, {
    publicOnly: !isOwner,
  }).catch(() => null);
  const shelf = result ?? {
    items: [],
    page: 1,
    pageSize: PROFILE_LIBRARY_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  if (shelf.total === 0) {
    return (
      <p className="mt-6 text-muted">
        {isOwner ? "No games in your library yet." : "No public library yet."}
      </p>
    );
  }

  const from = (shelf.page - 1) * shelf.pageSize + 1;
  const to = Math.min(shelf.page * shelf.pageSize, shelf.total);

  return (
    <div>
      <LibraryShelf items={shelf.items} showVisibility={isOwner} />
      <ProfilePager
        label="Library pages"
        from={from}
        to={to}
        total={shelf.total}
        page={shelf.page}
        totalPages={shelf.totalPages}
        prevHref={
          shelf.page > 1
            ? profileHref(username, {
                tab: "library",
                page: shelf.page - 1,
              })
            : null
        }
        nextHref={
          shelf.page < shelf.totalPages
            ? profileHref(username, {
                tab: "library",
                page: shelf.page + 1,
              })
            : null
        }
      />
    </div>
  );
}

async function ProfileFollowRoster({
  profileId,
  username,
  pageRaw,
  direction,
  isOwner,
}: {
  profileId: string;
  username: string;
  pageRaw: number;
  direction: "following" | "followers";
  isOwner: boolean;
}) {
  const loader =
    direction === "following" ? listFollowingPage : listFollowersPage;
  const result = await loader(profileId, pageRaw, {
    includePrivate: isOwner,
  }).catch(() => null);
  const roster = result ?? {
    people: [],
    page: 1,
    pageSize: FOLLOW_ROSTER_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  const from = (roster.page - 1) * roster.pageSize + 1;
  const to = Math.min(roster.page * roster.pageSize, roster.total);

  return (
    <div>
      <h2 className="mt-8 font-display text-3xl tracking-wide text-ink">
        {direction === "following" ? "Following" : "Followers"}
      </h2>
      <FollowRosterList
        people={roster.people}
        canUnfollow={isOwner && direction === "following"}
      />
      {roster.total === 0 ? null : (
        <ProfilePager
          label={
            direction === "following" ? "Following pages" : "Follower pages"
          }
          from={from}
          to={to}
          total={roster.total}
          page={roster.page}
          totalPages={roster.totalPages}
          prevHref={
            roster.page > 1
              ? profileHref(username, {
                  tab: direction,
                  page: roster.page - 1,
                })
              : null
          }
          nextHref={
            roster.page < roster.totalPages
              ? profileHref(username, {
                  tab: direction,
                  page: roster.page + 1,
                })
              : null
          }
        />
      )}
    </div>
  );
}
