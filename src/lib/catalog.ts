import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lte,
  gte,
  or,
  sql,
} from "drizzle-orm";
import { GOTY_ELIGIBLE_GAME_TYPE_IGDB_IDS } from "@/lib/igdb-game-types";
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
export type ReleaseStatus = "all" | "released" | "upcoming";

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
  limit?: number;
  offset?: number;
  includeAdult?: boolean;
};

function getDb(): Db {
  return createDb();
}

export async function browseGames(input: BrowseGamesInput = {}) {
  const db = getDb();
  const {
    q,
    year,
    yearAtMost,
    yearAtLeast,
    yearKnownAtLeast,
    sort = "popularity",
    sortDir = "desc",
    releaseStatus = "all",
    excludeEditions = false,
    gotyEligibleTypes = false,
    limit = 48,
    offset = 0,
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
    conditions.push(
      or(ilike(games.title, term), ilike(games.slug, term))!,
    );
  }
  if (excludeEditions) {
    conditions.push(isNull(games.versionParentIgdbId));
  }
  if (gotyEligibleTypes) {
    conditions.push(
      or(
        isNull(games.gameTypeIgdbId),
        inArray(games.gameTypeIgdbId, [...GOTY_ELIGIBLE_GAME_TYPE_IGDB_IDS]),
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
    conditions.push(
      or(
        isNull(games.firstReleaseDate),
        sql`${games.firstReleaseDate} > ${today}`,
      )!,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const order =
    sort === "name"
      ? sortDir === "asc"
        ? games.title
        : desc(games.title)
      : sort === "first_release_date"
        ? sortDir === "asc"
          ? games.firstReleaseDate
          : desc(games.firstReleaseDate)
        : sortDir === "asc"
          ? games.popularity
          : desc(games.popularity);

  const rows = await db
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
    .orderBy(order)
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
