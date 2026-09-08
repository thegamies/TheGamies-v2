import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FollowingFeed } from "@/components/activity/FollowingFeed";
import { TrendingBoard } from "@/components/activity/TrendingBoard";
import { FollowRosterList } from "@/components/follow/FollowRosterList";
import { PeopleSearchForm } from "@/components/people/PeopleSearchForm";
import { PeopleSearchResults } from "@/components/people/PeopleSearchResults";
import { ProfilePager } from "@/components/profile/ProfilePager";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import {
  FEED_PAGE_SIZE,
  TRENDING_PAGE_SIZE,
  listFollowingFeedPage,
  listTrendingBoard,
} from "@/lib/activity/query";
import { parseTrendingWindowHours } from "@/lib/activity/trending";
import {
  followingHref,
  parseFollowingView,
  peopleHref,
} from "@/lib/activity/paths";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { allowFollowSeedAccounts } from "@/lib/follow/rules";
import {
  FOLLOW_ROSTER_PAGE_SIZE,
  listFollowedAmong,
  listFollowedProfileIds,
  listFollowersPage,
  listFollowingPage,
} from "@/lib/follow/service";
import { searchPeople } from "@/lib/people/search";
import { parseProfilePage } from "@/lib/profile/profile-page";
import { noIndexRobots } from "@/lib/seo/site";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Following",
  robots: noIndexRobots,
};

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getRequestSessionUser();
  if (!user?.id) {
    const sp = await searchParams;
    const q = first(sp.q);
    redirect(peopleHref({ q }));
  }
  const profile = await getRequestProfileByAuthUserId(user.id).catch(() => null);
  if (!profile) {
    redirect("/auth/complete-profile?next=/following");
  }

  const sp = await searchParams;
  const view = parseFollowingView(first(sp.view));
  const pageRaw = parseProfilePage(first(sp.page));
  const q = first(sp.q) ?? "";
  const hoursRaw = first(sp.hours);

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">People</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Following
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Public library and ranked lists from people you follow, games moving
        among them, plus who you follow and a search for public profiles.
      </p>

      <ScrollableNav aria-label="Following" className="mt-8">
        <Link
          href={followingHref()}
          className={navItemClass("secondary", view === "activity")}
        >
          Activity
        </Link>
        <Link
          href={followingHref({ view: "trending" })}
          className={navItemClass("secondary", view === "trending")}
        >
          Trending
        </Link>
        <Link
          href={followingHref({ view: "following" })}
          className={navItemClass("secondary", view === "following")}
        >
          Following
        </Link>
        <Link
          href={followingHref({ view: "followers" })}
          className={navItemClass("secondary", view === "followers")}
        >
          Followers
        </Link>
        <Link
          href={followingHref({ view: "discover" })}
          className={navItemClass("secondary", view === "discover")}
        >
          Discover people
        </Link>
      </ScrollableNav>

      {view === "followers" ? (
        <FollowingRoster
          profileId={profile.id}
          pageRaw={pageRaw}
          direction="followers"
        />
      ) : view === "discover" ? (
        <FollowingDiscover
          profileId={profile.id}
          q={q}
          includeSeed={allowFollowSeedAccounts({
            isSiteAdmin: profile.isSiteAdmin,
          })}
        />
      ) : view === "following" ? (
        <FollowingRoster
          profileId={profile.id}
          pageRaw={pageRaw}
          direction="following"
        />
      ) : view === "trending" ? (
        <FollowingTrending
          profileId={profile.id}
          hoursRaw={hoursRaw}
          pageRaw={pageRaw}
        />
      ) : (
        <FollowingActivity profileId={profile.id} pageRaw={pageRaw} />
      )}
    </main>
  );
}

async function FollowingRoster({
  profileId,
  pageRaw,
  direction,
}: {
  profileId: string;
  pageRaw: number;
  direction: "following" | "followers";
}) {
  const load = direction === "following" ? listFollowingPage : listFollowersPage;
  const result = await load(profileId, pageRaw, { includePrivate: true }).catch(
    () => null,
  );
  const roster = result ?? {
    people: [],
    page: 1,
    pageSize: FOLLOW_ROSTER_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  if (roster.total === 0) {
    return (
      <p className="mt-10 max-w-xl text-muted">
        {direction === "following"
          ? "You are not following anyone yet. Search Discover people to find public profiles."
          : "No one is following you yet."}
      </p>
    );
  }

  const from = (roster.page - 1) * roster.pageSize + 1;
  const to = Math.min(roster.page * roster.pageSize, roster.total);

  function rosterHref(page: number) {
    return direction === "followers"
      ? followingHref({ view: "followers", page })
      : followingHref({ view: "following", page });
  }

  return (
    <div>
      <FollowRosterList
        people={roster.people}
        canUnfollow={direction === "following"}
      />
      <ProfilePager
        label={direction === "following" ? "Following pages" : "Follower pages"}
        from={from}
        to={to}
        total={roster.total}
        page={roster.page}
        totalPages={roster.totalPages}
        prevHref={roster.page > 1 ? rosterHref(roster.page - 1) : null}
        nextHref={
          roster.page < roster.totalPages ? rosterHref(roster.page + 1) : null
        }
      />
    </div>
  );
}

async function FollowingDiscover({
  profileId,
  q,
  includeSeed,
}: {
  profileId: string;
  q: string;
  includeSeed: boolean;
}) {
  const people = await searchPeople(q, {
    excludeProfileId: profileId,
    includeSeed,
  }).catch(() => []);
  const followedIds = await listFollowedAmong(
    profileId,
    people.map((person) => person.id),
  ).catch(() => new Set<string>());

  return (
    <div>
      <PeopleSearchForm
        action="/following"
        q={q}
        hidden={{ view: "discover" }}
      />
      <PeopleSearchResults
        people={people}
        q={q}
        followedIds={followedIds}
        showFollow
      />
    </div>
  );
}

async function FollowingTrending({
  profileId,
  hoursRaw,
  pageRaw,
}: {
  profileId: string;
  hoursRaw: string | undefined;
  pageRaw: number;
}) {
  const hours = parseTrendingWindowHours(hoursRaw);
  const followedIds = await listFollowedProfileIds(profileId).catch(() => []);
  const board = await listTrendingBoard({
    windowHours: hours,
    followedIds,
    applySiteFloor: false,
    page: pageRaw,
  }).catch(() => ({
    rows: [],
    windowHours: hours,
    publicReady: true,
    distinctPeople: 0,
    total: 0,
    page: 1,
    totalPages: 1,
  }));

  const from =
    board.total === 0 ? 0 : (board.page - 1) * TRENDING_PAGE_SIZE + 1;
  const to = Math.min(board.page * TRENDING_PAGE_SIZE, board.total);

  return (
    <div>
      <TrendingBoard
        rows={board.rows}
        hours={board.windowHours}
        scope="following"
        followingPage
        empty={
          followedIds.length === 0
            ? "Follow people whose lists you already open to see games moving among them."
            : "No games are moving among people you follow in this window."
        }
      />
      <ProfilePager
        label="Trending pages"
        from={from}
        to={to}
        total={board.total}
        page={board.page}
        totalPages={board.totalPages}
        prevHref={
          board.page > 1
            ? followingHref({
                view: "trending",
                hours: board.windowHours,
                page: board.page - 1,
              })
            : null
        }
        nextHref={
          board.page < board.totalPages
            ? followingHref({
                view: "trending",
                hours: board.windowHours,
                page: board.page + 1,
              })
            : null
        }
      />
    </div>
  );
}

async function FollowingActivity({
  profileId,
  pageRaw,
}: {
  profileId: string;
  pageRaw: number;
}) {
  const followedIds = await listFollowedProfileIds(profileId).catch(() => []);
  if (followedIds.length === 0) {
    return (
      <p className="mt-10 max-w-xl text-muted">
        Follow people from Discover people. Their public library and ranked
        lists will show up here.
      </p>
    );
  }

  const feed = await listFollowingFeedPage(followedIds, pageRaw).catch(() => ({
    cards: [],
    page: 1,
    hasMore: false,
  }));

  if (feed.cards.length === 0) {
    return (
      <p className="mt-10 max-w-xl text-muted">
        Nothing new yet. Follow people from Discover people.
      </p>
    );
  }

  return (
    <div>
      <FollowingFeed cards={feed.cards} />
      <ProfilePager
        label="Activity pages"
        from={feed.cards.length ? 1 : 0}
        to={feed.cards.length}
        total={feed.hasMore ? feed.page * FEED_PAGE_SIZE + 1 : feed.cards.length}
        page={feed.page}
        totalPages={feed.hasMore ? feed.page + 1 : feed.page}
        prevHref={
          feed.page > 1
            ? followingHref({ view: "activity", page: feed.page - 1 })
            : null
        }
        nextHref={
          feed.hasMore
            ? followingHref({ view: "activity", page: feed.page + 1 })
            : null
        }
      />
    </div>
  );
}
