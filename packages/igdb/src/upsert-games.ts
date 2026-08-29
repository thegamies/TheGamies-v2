import { inArray, sql } from "drizzle-orm";
import {
  gameArtworks,
  gameCompanies,
  gameGenres,
  gameKeywords,
  gamePlatforms,
  games,
  gameScreenshots,
  gameThemes,
  gameVideoLinks,
  type Db,
} from "@thegamies/db";
import { insertChunked } from "./chunk";
import type { MappedGame } from "./client";

export type GameLinkIdLists = Pick<
  MappedGame,
  | "platformIgdbIds"
  | "genreIgdbIds"
  | "themeIgdbIds"
  | "keywordIgdbIds"
  | "involvedCompanyIgdbIds"
  | "artworkIgdbIds"
  | "screenshotIgdbIds"
  | "videoIgdbIds"
>;

function packedIds(ids: number[]): string {
  return [...new Set(ids.filter((id) => Number.isFinite(id)))]
    .sort((a, b) => a - b)
    .join(",");
}

/** Stable fingerprint of junction id lists (order and duplicates do not matter). */
export function gameLinksChecksum(row: GameLinkIdLists): string {
  return [
    packedIds(row.platformIgdbIds),
    packedIds(row.genreIgdbIds),
    packedIds(row.themeIgdbIds),
    packedIds(row.keywordIgdbIds),
    packedIds(row.involvedCompanyIgdbIds),
    packedIds(row.artworkIgdbIds),
    packedIds(row.screenshotIgdbIds),
    packedIds(row.videoIgdbIds),
  ].join("|");
}

export function igdbIdsNeedingLinkRewrite(
  incoming: { igdbId: number; checksum: string }[],
  existingByIgdbId: Map<number, string | null>,
): Set<number> {
  const need = new Set<number>();
  for (const row of incoming) {
    const previous = existingByIgdbId.get(row.igdbId);
    if (previous === undefined || previous !== row.checksum) {
      need.add(row.igdbId);
    }
  }
  return need;
}

export function gameJunctionDeleteSql(gameIds: string[]) {
  const idList = sql.join(
    gameIds.map((id) => sql`${id}`),
    sql`, `,
  );
  return sql`
    WITH
      p AS (
        DELETE FROM ${gamePlatforms}
        WHERE ${gamePlatforms.gameId} IN (${idList})
        RETURNING 1
      ),
      g AS (
        DELETE FROM ${gameGenres}
        WHERE ${gameGenres.gameId} IN (${idList})
        RETURNING 1
      ),
      t AS (
        DELETE FROM ${gameThemes}
        WHERE ${gameThemes.gameId} IN (${idList})
        RETURNING 1
      ),
      k AS (
        DELETE FROM ${gameKeywords}
        WHERE ${gameKeywords.gameId} IN (${idList})
        RETURNING 1
      ),
      c AS (
        DELETE FROM ${gameCompanies}
        WHERE ${gameCompanies.gameId} IN (${idList})
        RETURNING 1
      ),
      a AS (
        DELETE FROM ${gameArtworks}
        WHERE ${gameArtworks.gameId} IN (${idList})
        RETURNING 1
      ),
      s AS (
        DELETE FROM ${gameScreenshots}
        WHERE ${gameScreenshots.gameId} IN (${idList})
        RETURNING 1
      ),
      v AS (
        DELETE FROM ${gameVideoLinks}
        WHERE ${gameVideoLinks.gameId} IN (${idList})
        RETURNING 1
      )
    SELECT 1
  `;
}

export async function upsertGamesWithLinks(
  db: Db,
  rows: MappedGame[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const checksumByIgdb = new Map(
    rows.map((row) => [row.igdbId, gameLinksChecksum(row)]),
  );
  const igdbIds = rows.map((row) => row.igdbId);
  const existingChecksum = new Map<number, string | null>();
  if (igdbIds.length > 0) {
    const existing = await db
      .select({
        igdbId: games.igdbId,
        linksChecksum: games.linksChecksum,
      })
      .from(games)
      .where(inArray(games.igdbId, igdbIds));
    for (const row of existing) {
      existingChecksum.set(row.igdbId, row.linksChecksum);
    }
  }
  const rewriteIgdbIds = igdbIdsNeedingLinkRewrite(
    rows.map((row) => ({
      igdbId: row.igdbId,
      checksum: checksumByIgdb.get(row.igdbId)!,
    })),
    existingChecksum,
  );

  const idRows: { id: string; igdbId: number }[] = [];
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
      linksChecksum: checksumByIgdb.get(row.igdbId)!,
      syncedAt: new Date(),
    })),
    async (chunk) => {
      const returned = await db
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
            linksChecksum: sql`excluded.links_checksum`,
            igdbRemovedAt: sql`null`,
            syncedAt: sql`now()`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: games.id, igdbId: games.igdbId });
      idRows.push(...returned);
    },
  );

  if (idRows.length === 0) {
    const fallback = await db
      .select({ id: games.id, igdbId: games.igdbId })
      .from(games)
      .where(inArray(games.igdbId, igdbIds));
    idRows.push(...fallback);
  }

  const idByIgdb = new Map(idRows.map((r) => [r.igdbId, r.id]));
  const rewriteGameIds = [
    ...new Set(
      rows
        .filter((row) => rewriteIgdbIds.has(row.igdbId))
        .map((row) => idByIgdb.get(row.igdbId))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (rewriteGameIds.length === 0) return rows.length;

  const rewriteIgdb = new Set(
    rows
      .filter((row) => rewriteIgdbIds.has(row.igdbId) && idByIgdb.has(row.igdbId))
      .map((row) => row.igdbId),
  );

  const platformLinks: { gameId: string; platformIgdbId: number }[] = [];
  const genreLinks: { gameId: string; genreIgdbId: number }[] = [];
  const themeLinks: { gameId: string; themeIgdbId: number }[] = [];
  const keywordLinks: { gameId: string; keywordIgdbId: number }[] = [];
  const companyLinks: { gameId: string; involvedCompanyIgdbId: number }[] = [];
  const artworkLinks: { gameId: string; artworkIgdbId: number }[] = [];
  const screenshotLinks: { gameId: string; screenshotIgdbId: number }[] = [];
  const videoLinks: { gameId: string; videoIgdbId: number }[] = [];

  for (const row of rows) {
    if (!rewriteIgdb.has(row.igdbId)) continue;
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
    for (const artworkIgdbId of row.artworkIgdbIds) {
      artworkLinks.push({ gameId, artworkIgdbId });
    }
    for (const screenshotIgdbId of row.screenshotIgdbIds) {
      screenshotLinks.push({ gameId, screenshotIgdbId });
    }
    for (const videoIgdbId of row.videoIgdbIds) {
      videoLinks.push({ gameId, videoIgdbId });
    }
  }

  await db.execute(gameJunctionDeleteSql(rewriteGameIds));

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
  await insertChunked(artworkLinks, (chunk) =>
    db.insert(gameArtworks).values(chunk).onConflictDoNothing(),
  );
  await insertChunked(screenshotLinks, (chunk) =>
    db.insert(gameScreenshots).values(chunk).onConflictDoNothing(),
  );
  await insertChunked(videoLinks, (chunk) =>
    db.insert(gameVideoLinks).values(chunk).onConflictDoNothing(),
  );

  return rows.length;
}
