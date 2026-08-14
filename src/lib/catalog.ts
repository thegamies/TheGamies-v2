import { and, desc, eq, ilike, isNull, lte, gte, or, sql } from "drizzle-orm";
import { createDb, type Db } from "@thegamies/db";
import {
  companies,
  covers,
  gameCompanies,
  gameGenres,
  gamePlatforms,
  games,
  gameTimeToBeats,
  gameTypes,
  genres,
  platforms,
} from "@thegamies/db/schema";
import { coverUrlFromImageId } from "@thegamies/igdb";

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
    limit = 48,
    offset = 0,
    includeAdult = false,
  } = input;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const conditions = [];
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
