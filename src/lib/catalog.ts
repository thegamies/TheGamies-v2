import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lte,
  gte,
  or,
  sql,
} from "drizzle-orm";
import { categoryEligibleGameTypeIgdbIds } from "@/lib/igdb-game-types";
import {
  companies,
  covers,
  createDb,
  gameCompanies,
  gameGenres,
  gamePlatforms,
  games,
  gameTimeToBeats,
  gameTypes,
  genres,
  platforms,
  readCatalogGameCount,
  refreshCatalogGameCount,
  type Db,
} from "@thegamies/db";
import { coverUrlFromImageId, wideImageUrlFromImageId, youtubePosterUrl } from "@thegamies/igdb";
import {
  GAME_DETAIL_ARTWORK_CAP,
  GAME_DETAIL_SCREENSHOT_CAP,
  GAME_DETAIL_VIDEO_CAP,
  gameArtworksForDetailQuery,
  gameScreenshotsForDetailQuery,
  gameVideosForDetailQuery,
} from "@/lib/catalog-game-detail";

export type BrowseSort = "popularity" | "name" | "first_release_date";
/** `unreleased` is for award search (later years, dated or not). Not a browse chip. */
export type ReleaseStatus = "all" | "released" | "upcoming" | "unreleased";

/** Dated Upcoming rails and `/games?releaseStatus=upcoming`. */
export const UPCOMING_HORIZON_MONTHS = 6;

/** Exclusive after start of UTC today, inclusive through the same calendar day plus N months. */
export function upcomingReleaseWindow(
  now = new Date(),
  months = UPCOMING_HORIZON_MONTHS,
): { after: Date; onOrBefore: Date } {
  const after = new Date(now);
  after.setUTCHours(0, 0, 0, 0);
  const onOrBefore = new Date(after);
  onOrBefore.setUTCMonth(onOrBefore.getUTCMonth() + months);
  return { after, onOrBefore };
}

export type BrowseGamesInput = {
  q?: string;
  year?: number;
  yearAtMost?: number;
  yearAtLeast?: number;
  /** Inclusive lower bound; unknown years are excluded. */
  yearKnownAtLeast?: number;
  sort?: BrowseSort;
  sortDir?: "asc" | "desc";
  releaseStatus?: ReleaseStatus;
  excludeEditions?: boolean;
  /** Main games + expansions/remakes; excludes packs, DLC/addons, bundles. */
  gotyEligibleTypes?: boolean;
  /** With `gotyEligibleTypes`, also include IGDB DLC/addon (Best Expansion / DLC). */
  includeDlcAddonType?: boolean;
  limit?: number;
  offset?: number;
  includeAdult?: boolean;
};

export const GAMES_BROWSE_PAGE_SIZE = 48;

function getDb(): Db {
  return createDb();
}

function browseGamesWhere(input: BrowseGamesInput) {
  const {
    q,
    year,
    yearAtMost,
    yearAtLeast,
    yearKnownAtLeast,
    releaseStatus = "all",
    excludeEditions = false,
    gotyEligibleTypes = false,
    includeDlcAddonType = false,
    includeAdult = false,
  } = input;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const conditions = [];
  conditions.push(isNull(games.igdbRemovedAt));
  if (!includeAdult) {
    conditions.push(eq(games.isAdult, false));
  }
  if (year != null) {
    conditions.push(eq(games.year, year));
  }
  if (yearAtMost != null) {
    conditions.push(or(isNull(games.year), lte(games.year, yearAtMost))!);
  }
  if (yearAtLeast != null) {
    conditions.push(or(isNull(games.year), gte(games.year, yearAtLeast))!);
  }
  if (yearKnownAtLeast != null) {
    conditions.push(gte(games.year, yearKnownAtLeast));
  }
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(or(ilike(games.title, term), ilike(games.slug, term))!);
  }
  if (excludeEditions) {
    conditions.push(isNull(games.versionParentIgdbId));
  }
  if (gotyEligibleTypes) {
    conditions.push(
      or(
        isNull(games.gameTypeIgdbId),
        inArray(
          games.gameTypeIgdbId,
          categoryEligibleGameTypeIgdbIds({
            allowDlcAddon: includeDlcAddonType,
          }),
        ),
      )!,
    );
  }
  if (releaseStatus === "released") {
    conditions.push(
      and(
        sql`${games.firstReleaseDate} is not null`,
        sql`${games.firstReleaseDate} <= ${today}`,
      )!,
    );
  } else if (releaseStatus === "upcoming") {
    const { after, onOrBefore } = upcomingReleaseWindow(today);
    conditions.push(
      and(
        sql`${games.firstReleaseDate} is not null`,
        gt(games.firstReleaseDate, after),
        lte(games.firstReleaseDate, onOrBefore),
      )!,
    );
  } else if (releaseStatus === "unreleased") {
    conditions.push(
      or(
        isNull(games.firstReleaseDate),
        sql`${games.firstReleaseDate} > ${today}`,
      )!,
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}

/** Matches the stored `site_settings.catalog_game_count` snapshot. */
export function isDefaultCatalogCountInput(
  input: BrowseGamesInput = {},
): boolean {
  if (input.q?.trim()) return false;
  if (input.year != null) return false;
  if (input.yearAtMost != null) return false;
  if (input.yearAtLeast != null) return false;
  if (input.yearKnownAtLeast != null) return false;
  if (input.releaseStatus != null && input.releaseStatus !== "all") {
    return false;
  }
  if (input.excludeEditions) return false;
  if (input.gotyEligibleTypes) return false;
  if (input.includeAdult) return false;
  return true;
}

export function sliceSearchPage<T>(
  rows: T[],
  pageSize: number,
): { items: T[]; hasMore: boolean } {
  const size = Math.max(1, pageSize);
  const hasMore = rows.length > size;
  return { items: hasMore ? rows.slice(0, size) : rows, hasMore };
}

export async function countBrowseGames(
  input: BrowseGamesInput = {},
): Promise<number> {
  const db = getDb();
  if (isDefaultCatalogCountInput(input)) {
    const stored = await readCatalogGameCount(db);
    if (stored != null) return stored;
    return refreshCatalogGameCount(db);
  }
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(games)
    .where(browseGamesWhere(input));
  return Number(row?.n ?? 0);
}

/**
 * Drizzle omits a numeric offset of 0. A SQL literal stays in the query and
 * stops Postgres from walking `games_popularity_idx` to satisfy
 * `ORDER BY popularity LIMIT` — that walk reads the catalog for a word like
 * "portal", whose matches are not packed at the top.
 */
function searchMatchOffset(): number {
  return sql`0` as unknown as number;
}

type RankColumn = Parameters<typeof desc>[0];

function browseRank(
  sort: BrowseSort,
  sortDir: "asc" | "desc",
  cols: {
    title: RankColumn;
    firstReleaseDate: RankColumn;
    popularity: RankColumn;
  },
) {
  const column =
    sort === "name"
      ? cols.title
      : sort === "first_release_date"
        ? cols.firstReleaseDate
        : cols.popularity;
  return sortDir === "asc" ? asc(column) : desc(column);
}

/**
 * Text search: trigram-match title and slug, sort and limit that set, then
 * attach covers for the page. Joining covers before the limit looked up a
 * cover for every hit (a word like "dark").
 */
export function browseGamesSearchQuery(db: Db, input: BrowseGamesInput) {
  const {
    sort = "popularity",
    sortDir = "desc",
    limit = GAMES_BROWSE_PAGE_SIZE,
    offset = 0,
  } = input;
  const where = browseGamesWhere(input);

  const matched = db
    .select({
      id: games.id,
      igdbId: games.igdbId,
      slug: games.slug,
      title: games.title,
      year: games.year,
      firstReleaseDate: games.firstReleaseDate,
      popularity: games.popularity,
      coverIgdbId: games.coverIgdbId,
    })
    .from(games)
    .where(where)
    .offset(searchMatchOffset())
    .as("matched");

  const page = db
    .select({
      id: matched.id,
      igdbId: matched.igdbId,
      slug: matched.slug,
      title: matched.title,
      year: matched.year,
      firstReleaseDate: matched.firstReleaseDate,
      popularity: matched.popularity,
      coverIgdbId: matched.coverIgdbId,
    })
    .from(matched)
    .orderBy(browseRank(sort, sortDir, matched), matched.id)
    .limit(limit)
    .offset(offset)
    .as("page");

  return db
    .select({
      id: page.id,
      igdbId: page.igdbId,
      slug: page.slug,
      title: page.title,
      year: page.year,
      firstReleaseDate: page.firstReleaseDate,
      popularity: page.popularity,
      coverImageId: covers.imageId,
    })
    .from(page)
    .leftJoin(covers, eq(covers.igdbId, page.coverIgdbId))
    .orderBy(browseRank(sort, sortDir, page), page.id);
}

export async function browseGames(input: BrowseGamesInput = {}) {
  const db = getDb();
  const {
    sort = "popularity",
    sortDir = "desc",
    limit = GAMES_BROWSE_PAGE_SIZE,
    offset = 0,
  } = input;

  const where = browseGamesWhere(input);

  const rows = input.q?.trim()
    ? await browseGamesSearchQuery(db, input)
    : await db
        .select({
          id: games.id,
          igdbId: games.igdbId,
          slug: games.slug,
          title: games.title,
          year: games.year,
          firstReleaseDate: games.firstReleaseDate,
          popularity: games.popularity,
          coverImageId: covers.imageId,
        })
        .from(games)
        .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
        .where(where)
        .orderBy(browseRank(sort, sortDir, games), games.id)
        .limit(limit)
        .offset(offset);

  return rows.map((r) => ({
    ...r,
    coverUrl: coverUrlFromImageId(r.coverImageId),
  }));
}

export async function getGameBySlug(slug: string) {
  const db = getDb();
  const [game] = await db
    .select({
      id: games.id,
      igdbId: games.igdbId,
      slug: games.slug,
      title: games.title,
      summary: games.summary,
      year: games.year,
      firstReleaseDate: games.firstReleaseDate,
      popularity: games.popularity,
      rating: games.rating,
      ratingCount: games.ratingCount,
      isAdult: games.isAdult,
      parentGameIgdbId: games.parentGameIgdbId,
      versionParentIgdbId: games.versionParentIgdbId,
      coverImageId: covers.imageId,
      gameType: gameTypes.type,
    })
    .from(games)
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .leftJoin(gameTypes, eq(gameTypes.igdbId, games.gameTypeIgdbId))
    .where(eq(games.slug, slug))
    .limit(1);

  if (!game) return null;

  const [platformRows, genreRows, companyRows, ttb] = await Promise.all([
    db
      .select({
        name: platforms.name,
        abbreviation: platforms.abbreviation,
      })
      .from(gamePlatforms)
      .innerJoin(
        platforms,
        eq(platforms.igdbId, gamePlatforms.platformIgdbId),
      )
      .where(eq(gamePlatforms.gameId, game.id)),
    db
      .select({ name: genres.name })
      .from(gameGenres)
      .innerJoin(genres, eq(genres.igdbId, gameGenres.genreIgdbId))
      .where(eq(gameGenres.gameId, game.id)),
    db
      .select({
        name: companies.name,
        developer: gameCompanies.developer,
        publisher: gameCompanies.publisher,
      })
      .from(gameCompanies)
      .innerJoin(
        companies,
        eq(companies.igdbId, gameCompanies.companyIgdbId),
      )
      .where(eq(gameCompanies.gameId, game.id)),
    db
      .select()
      .from(gameTimeToBeats)
      .where(eq(gameTimeToBeats.gameIgdbId, game.igdbId))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  return {
    ...game,
    coverUrl: coverUrlFromImageId(game.coverImageId),
    platforms: platformRows,
    genres: genreRows,
    companies: companyRows,
    timeToBeat: ttb,
  };
}

export {
  GAME_DETAIL_ARTWORK_CAP,
  GAME_DETAIL_SCREENSHOT_CAP,
  GAME_DETAIL_VIDEO_CAP,
  gameArtworksForDetailQuery,
  gameScreenshotsForDetailQuery,
  gameVideosForDetailQuery,
};

export type GameArtworkStill = {
  igdbId: number;
  imageUrl: string;
  imageTypeName: string | null;
  width: number | null;
  height: number | null;
};

export type GameScreenshotStill = {
  igdbId: number;
  imageUrl: string;
  width: number | null;
  height: number | null;
};

export type GameVideoClip = {
  igdbId: number;
  name: string;
  videoId: string;
  posterUrl: string | null;
};

export async function getGameArtworksForDetail(
  gameId: string,
): Promise<GameArtworkStill[]> {
  const rows = await gameArtworksForDetailQuery(getDb(), gameId);

  return rows.flatMap((row) => {
    const imageUrl = wideImageUrlFromImageId(row.imageId);
    if (!imageUrl) return [];
    return [
      {
        igdbId: row.igdbId,
        imageUrl,
        imageTypeName: row.imageTypeName,
        width: row.width,
        height: row.height,
      },
    ];
  });
}

export async function getGameScreenshotsForDetail(
  gameId: string,
): Promise<GameScreenshotStill[]> {
  const rows = await gameScreenshotsForDetailQuery(getDb(), gameId);

  return rows.flatMap((row) => {
    const imageUrl = wideImageUrlFromImageId(row.imageId);
    if (!imageUrl) return [];
    return [{ igdbId: row.igdbId, imageUrl, width: row.width, height: row.height }];
  });
}

export async function getGameVideosForDetail(
  gameId: string,
): Promise<GameVideoClip[]> {
  const rows = await gameVideosForDetailQuery(getDb(), gameId);

  return rows.flatMap((row) => {
    const videoId = row.videoId?.trim();
    if (!videoId) return [];
    return [
      {
        igdbId: row.igdbId,
        name: row.name?.trim() || "Trailer",
        videoId,
        posterUrl: youtubePosterUrl(videoId),
      },
    ];
  });
}
