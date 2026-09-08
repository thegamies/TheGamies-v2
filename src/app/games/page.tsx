import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  isCatalogBrowseSort,
  parseGamesBrowseSort,
} from "@/components/games/browse-filters";
import { TrendingBoard } from "@/components/activity/TrendingBoard";
import { GamesBrowseFilters } from "@/components/games/GamesBrowseFilters";
import { GameCover } from "@/components/ui/GameCover";
import { ProfilePager } from "@/components/profile/ProfilePager";
import {
  TRENDING_PAGE_SIZE,
  listTrendingBoard,
} from "@/lib/activity/query";
import { gamesBrowseHref, parseTrendingScope, trendingHref } from "@/lib/activity/paths";
import { parseTrendingWindowHours } from "@/lib/activity/trending";
import { buildSignInHref } from "@/lib/auth/return-to";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  GAMES_BROWSE_PAGE_SIZE,
  browseGames,
  countBrowseGames,
} from "@/lib/catalog";
import { listFollowedProfileIds } from "@/lib/follow/service";
import { paginateProfileItems, parseProfilePage } from "@/lib/profile/profile-page";
import { publicPageMetadata } from "@/lib/seo/site";
import { getPublicTrendingMinPeople } from "@/lib/site-settings/service";

export const metadata: Metadata = publicPageMetadata({
  title: "Games",
  description: "Browse the game catalog on The Gamies.",
  path: "/games",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const yearRaw = first(params.year);
  const year = yearRaw ? Number(yearRaw) : undefined;
  const sort = parseGamesBrowseSort(first(params.sort));
  const sortDir = (first(params.sortDir) as "asc" | "desc") ?? "desc";
  const releaseStatus =
    (first(params.releaseStatus) as "all" | "released" | "upcoming") ?? "all";
  const hoursRaw = first(params.hours);
  const scopeRaw = first(params.scope);
  const pageRaw = parseProfilePage(first(params.page));

  return (
    <>
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
        <h1 className="font-display text-5xl tracking-wide text-ink md:text-7xl">
          Games
        </h1>

        <GamesBrowseFilters
          key={`${q}|${year ?? ""}|${sort}|${sortDir}|${releaseStatus}|${hoursRaw ?? ""}|${scopeRaw ?? ""}`}
          q={q}
          year={year && !Number.isNaN(year) ? year : undefined}
          sort={sort}
          sortDir={sortDir}
          releaseStatus={releaseStatus}
          hours={hoursRaw}
          scope={scopeRaw}
        />

        {sort === "trending" ? (
          <GamesTrendingSection
            hoursRaw={hoursRaw}
            scopeRaw={scopeRaw}
            pageRaw={pageRaw}
          />
        ) : (
          <GamesCatalogGrid
            q={q}
            year={year}
            sort={sort}
            sortDir={sortDir}
            releaseStatus={releaseStatus}
            pageRaw={pageRaw}
          />
        )}
      </main>
    </>
  );
}

async function GamesTrendingSection({
  hoursRaw,
  scopeRaw,
  pageRaw,
}: {
  hoursRaw: string | undefined;
  scopeRaw: string | undefined;
  pageRaw: number;
}) {
  const hours = parseTrendingWindowHours(hoursRaw);
  const scope = parseTrendingScope(scopeRaw);
  const user = await getRequestSessionUser();
  const signedIn = Boolean(user?.id);

  if (scope === "following") {
    if (!user?.id) {
      redirect(
        buildSignInHref({
          next: trendingHref({ hours, scope: "following" }),
        }),
      );
    }
    const profile = await getRequestProfileByAuthUserId(user.id).catch(
      () => null,
    );
    if (!profile) {
      redirect(
        `/auth/complete-profile?next=${encodeURIComponent(
          trendingHref({ hours, scope: "following" }),
        )}`,
      );
    }
    const followedIds = await listFollowedProfileIds(profile.id).catch(() => []);
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

    return (
      <>
        <TrendingBoard
          rows={board.rows}
          hours={board.windowHours}
          scope="following"
          showFollowingScope={signedIn}
          empty={
            followedIds.length === 0
              ? "Follow people whose lists you already open to see games moving among them."
              : "No games are moving among people you follow in this window."
          }
        />
        <GamesPager
          page={board.page}
          total={board.total}
          pageSize={TRENDING_PAGE_SIZE}
          hrefForPage={(page) =>
            trendingHref({ hours: board.windowHours, scope: "following", page })
          }
        />
      </>
    );
  }

  const minPeople = await getPublicTrendingMinPeople().catch(() => 5);
  const board = await listTrendingBoard({
    windowHours: hours,
    applySiteFloor: true,
    minPeople,
    page: pageRaw,
  }).catch(() => ({
    rows: [],
    windowHours: hours,
    publicReady: false,
    distinctPeople: 0,
    total: 0,
    page: 1,
    totalPages: 1,
  }));

  return (
    <>
      <TrendingBoard
        rows={board.rows}
        hours={board.windowHours}
        showFollowingScope={signedIn}
        empty="Trending is still warming up. Check back when more people are playing and ranking games."
      />
      <GamesPager
        page={board.page}
        total={board.total}
        pageSize={TRENDING_PAGE_SIZE}
        hrefForPage={(page) =>
          trendingHref({ hours: board.windowHours, page })
        }
      />
    </>
  );
}

async function GamesCatalogGrid({
  q,
  year,
  sort,
  sortDir,
  releaseStatus,
  pageRaw,
}: {
  q: string;
  year: number | undefined;
  sort: ReturnType<typeof parseGamesBrowseSort>;
  sortDir: "asc" | "desc";
  releaseStatus: "all" | "released" | "upcoming";
  pageRaw: number;
}) {
  if (!isCatalogBrowseSort(sort)) return null;

  const filters = {
    q: q || undefined,
    year: year && !Number.isNaN(year) ? year : undefined,
    sort,
    sortDir,
    releaseStatus,
  };

  let games: Awaited<ReturnType<typeof browseGames>> = [];
  let total = 0;
  let error: string | null = null;
  let page = 1;
  let totalPages = 1;
  try {
    total = await countBrowseGames(filters);
    if (total === 0) {
      return <p className="mt-8 text-muted">No games in the catalog yet.</p>;
    }
    const paging = paginateProfileItems(pageRaw, total, GAMES_BROWSE_PAGE_SIZE);
    page = paging.page;
    totalPages = paging.totalPages;
    games = await browseGames({
      ...filters,
      limit: GAMES_BROWSE_PAGE_SIZE,
      offset: paging.offset,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  if (error) {
    return (
      <p className="mt-8 text-accent">Could not load games. Try again later.</p>
    );
  }
  if (games.length === 0) {
    return <p className="mt-8 text-muted">No games in the catalog yet.</p>;
  }

  const from = (page - 1) * GAMES_BROWSE_PAGE_SIZE + 1;
  const to = Math.min(page * GAMES_BROWSE_PAGE_SIZE, total);

  return (
    <>
      <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {games.map((game) => (
          <li key={game.id}>
            <Link href={`/games/${game.slug}`} className="group block">
              <GameCover title={game.title} imageUrl={game.coverUrl} />
              <p className="mt-2 font-display text-lg leading-none tracking-wide text-ink group-hover:text-accent">
                {game.title}
              </p>
              <p className="mt-1 text-xs text-muted">{game.year ?? "TBD"}</p>
            </Link>
          </li>
        ))}
      </ul>
      <ProfilePager
        label="Games pages"
        from={from}
        to={to}
        total={total}
        page={page}
        totalPages={totalPages}
        prevHref={
          page > 1
            ? gamesBrowseHref({ ...filters, page: page - 1 })
            : null
        }
        nextHref={
          page < totalPages
            ? gamesBrowseHref({ ...filters, page: page + 1 })
            : null
        }
      />
    </>
  );
}

function GamesPager({
  page,
  total,
  pageSize,
  hrefForPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
}) {
  if (total <= 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <ProfilePager
      label="Games pages"
      from={from}
      to={to}
      total={total}
      page={page}
      totalPages={totalPages}
      prevHref={page > 1 ? hrefForPage(page - 1) : null}
      nextHref={page < totalPages ? hrefForPage(page + 1) : null}
    />
  );
}
