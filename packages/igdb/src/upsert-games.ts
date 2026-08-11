import { sql } from "drizzle-orm";
import { inArray } from "drizzle-orm";
import type { Db } from "@thegamies/db";
import {
  gameCompanies,
  gameGenres,
  gameKeywords,
  gamePlatforms,
  games,
  gameThemes,
} from "@thegamies/db/schema";
import { insertChunked } from "./chunk";
import type { MappedGame } from "./client";

export async function upsertGamesWithLinks(
  db: Db,
  rows: MappedGame[],
): Promise<number> {
  if (rows.length === 0) return 0;

  await insertChunked(
    rows.map((row) => ({
      igdbId: row.igdbId,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      year: row.year,
      firstReleaseDate: row.firstReleaseDate,
      coverIgdbId: row.coverIgdbId,
      gameTypeIgdbId: row.gameTypeIgdbId,
      parentGameIgdbId: row.parentGameIgdbId,
      versionParentIgdbId: row.versionParentIgdbId,
      isAdult: row.isAdult,
      rating: row.rating,
      ratingCount: row.ratingCount,
      follows: row.follows,
      hypes: row.hypes,
      popularity: row.popularity,
      syncedAt: new Date(),
    })),
    (chunk) =>
      db
        .insert(games)
        .values(chunk)
        .onConflictDoUpdate({
          target: games.igdbId,
          set: {
            slug: sql`excluded.slug`,
            title: sql`excluded.title`,
            summary: sql`excluded.summary`,
            year: sql`excluded.year`,
            firstReleaseDate: sql`excluded.first_release_date`,
            coverIgdbId: sql`excluded.cover_igdb_id`,
            gameTypeIgdbId: sql`excluded.game_type_igdb_id`,
            parentGameIgdbId: sql`excluded.parent_game_igdb_id`,
            versionParentIgdbId: sql`excluded.version_parent_igdb_id`,
            isAdult: sql`excluded.is_adult`,
            rating: sql`excluded.rating`,
            ratingCount: sql`excluded.rating_count`,
            follows: sql`excluded.follows`,
            hypes: sql`excluded.hypes`,
            popularity: sql`excluded.popularity`,
            syncedAt: sql`now()`,
            updatedAt: sql`now()`,
          },
        }),
  );

  const igdbIds = rows.map((r) => r.igdbId);
  const idRows = await db
    .select({ id: games.id, igdbId: games.igdbId })
    .from(games)
    .where(inArray(games.igdbId, igdbIds));

  const idByIgdb = new Map(idRows.map((r) => [r.igdbId, r.id]));
  const gameIds = [...idByIgdb.values()];

  const platformLinks: { gameId: string; platformIgdbId: number }[] = [];
  const genreLinks: { gameId: string; genreIgdbId: number }[] = [];
  const themeLinks: { gameId: string; themeIgdbId: number }[] = [];
  const keywordLinks: { gameId: string; keywordIgdbId: number }[] = [];
  const companyLinks: { gameId: string; involvedCompanyIgdbId: number }[] = [];

  for (const row of rows) {
    const gameId = idByIgdb.get(row.igdbId);
    if (!gameId) continue;
    for (const platformIgdbId of row.platformIgdbIds) {
      platformLinks.push({ gameId, platformIgdbId });
    }
    for (const genreIgdbId of row.genreIgdbIds) {
      genreLinks.push({ gameId, genreIgdbId });
    }
    for (const themeIgdbId of row.themeIgdbIds) {
      themeLinks.push({ gameId, themeIgdbId });
    }
    for (const keywordIgdbId of row.keywordIgdbIds) {
      keywordLinks.push({ gameId, keywordIgdbId });
    }
    for (const involvedCompanyIgdbId of row.involvedCompanyIgdbIds) {
      companyLinks.push({ gameId, involvedCompanyIgdbId });
    }
  }

  if (gameIds.length > 0) {
    await db
      .delete(gamePlatforms)
      .where(inArray(gamePlatforms.gameId, gameIds));
    await db.delete(gameGenres).where(inArray(gameGenres.gameId, gameIds));
    await db.delete(gameThemes).where(inArray(gameThemes.gameId, gameIds));
    await db.delete(gameKeywords).where(inArray(gameKeywords.gameId, gameIds));
    await db
      .delete(gameCompanies)
      .where(inArray(gameCompanies.gameId, gameIds));
  }

  await insertChunked(platformLinks, (chunk) =>
    db.insert(gamePlatforms).values(chunk).onConflictDoNothing(),
  );
  await insertChunked(genreLinks, (chunk) =>
    db.insert(gameGenres).values(chunk).onConflictDoNothing(),
  );
  await insertChunked(themeLinks, (chunk) =>
    db.insert(gameThemes).values(chunk).onConflictDoNothing(),
  );
  await insertChunked(keywordLinks, (chunk) =>
    db.insert(gameKeywords).values(chunk).onConflictDoNothing(),
  );
  await insertChunked(companyLinks, (chunk) =>
    db.insert(gameCompanies).values(chunk).onConflictDoNothing(),
  );

  return rows.length;
}
