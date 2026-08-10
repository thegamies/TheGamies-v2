import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { Db } from "@thegamies/db";
import {
  companies,
  covers,
  gameCompanies,
  gameGenres,
  gameKeywords,
  gamePlatforms,
  games,
  gameThemes,
  gameTimeToBeats,
  gameTypes,
  genres,
  keywords,
  platforms,
  syncRuns,
  themes,
} from "@thegamies/db/schema";
import {
  fetchByIds,
  fetchGamesPage,
  fetchUpdatedGamesPage,
  igdbQuery,
  mapIgdbGame,
  resolveAdultFilters,
} from "./client";
import { evaluateBackfillResume } from "./backfill-resume";
import { INSERT_CHUNK, insertChunked } from "./chunk";
import {
  finishSyncRun,
  getLastSuccessfulSyncDate,
  startSyncRun,
  updateSyncRun,
} from "./sync-runs";
import {
  DEFAULT_LOOKBACK_SECONDS,
  MAX_PAGES_PER_RUN,
  OVERHANG_SECONDS,
} from "./sync-constants";
import { upsertGamesWithLinks } from "./upsert-games";

export {
  DEFAULT_LOOKBACK_SECONDS,
  MAX_PAGES_PER_RUN,
  OVERHANG_SECONDS,
} from "./sync-constants";

export type SyncChunkResult = {
  synced: number;
  pages: number;
  lastId: number;
  truncated: boolean;
  runId: string;
};

function yearEq(year?: number) {
  return year != null ? eq(games.year, year) : undefined;
}

export async function runBackfillSync(
  db: Db,
  options: {
    year?: number;
    afterId?: number;
    maxPages?: number;
    limit?: number;
  } = {},
): Promise<SyncChunkResult> {
  const maxPages = options.maxPages ?? MAX_PAGES_PER_RUN;
  const limit = options.limit ?? 500;
  const filters = await resolveAdultFilters();
  const runId = await startSyncRun(db, "backfill", {
    year: options.year ?? null,
    afterId: options.afterId ?? 0,
    maxPages,
  });

  let afterId = options.afterId ?? 0;
  let synced = 0;
  let pages = 0;

  try {
    while (pages < maxPages) {
      const page = await fetchGamesPage({
        afterId,
        limit,
        year: options.year,
      });
      if (page.length === 0) break;

      const rows = page
        .map((g) => mapIgdbGame(g, filters))
        .filter((r): r is NonNullable<typeof r> => r !== null);

      await upsertGamesWithLinks(db, rows);
      synced += rows.length;
      pages += 1;
      afterId = page[page.length - 1].id;

      await updateSyncRun(db, runId, {
        rowsProcessed: synced,
        pages,
        lastIgdbId: afterId,
      });

      if (page.length < limit) break;
    }

    const truncated = pages >= maxPages;
    await finishSyncRun(db, runId, {
      status: "success",
      rowsProcessed: synced,
      pages,
      lastIgdbId: afterId,
      scope: {
        year: options.year ?? null,
        afterId: options.afterId ?? 0,
        maxPages,
        truncated,
      },
    });

    return { synced, pages, lastId: afterId, truncated, runId };
  } catch (error) {
    await finishSyncRun(db, runId, {
      status: "error",
      rowsProcessed: synced,
      pages,
      lastIgdbId: afterId,
      error: error instanceof Error ? error.message : String(error),
      scope: {
        year: options.year ?? null,
        afterId: options.afterId ?? 0,
        maxPages,
        truncated: true,
      },
    });
    throw error;
  }
}

export async function runIncrementalSync(
  db: Db,
  options: { maxPages?: number } = {},
): Promise<SyncChunkResult & { sinceUnix: number }> {
  const maxPages = options.maxPages ?? MAX_PAGES_PER_RUN;
  const filters = await resolveAdultFilters();
  const lastSuccess = await getLastSuccessfulSyncDate(db);
  const nowUnix = Math.floor(Date.now() / 1000);
  const sinceUnix = lastSuccess
    ? Math.floor(lastSuccess.getTime() / 1000) - OVERHANG_SECONDS
    : nowUnix - DEFAULT_LOOKBACK_SECONDS;

  const runId = await startSyncRun(db, "incremental", { sinceUnix });
  let afterId = 0;
  let synced = 0;
  let pages = 0;

  try {
    while (pages < maxPages) {
      const page = await fetchUpdatedGamesPage(sinceUnix, afterId, 500);
      if (page.length === 0) break;

      const rows = page
        .map((g) => mapIgdbGame(g, filters))
        .filter((r): r is NonNullable<typeof r> => r !== null);

      await upsertGamesWithLinks(db, rows);
      synced += rows.length;
      pages += 1;
      afterId = page[page.length - 1].id;

      await updateSyncRun(db, runId, {
        rowsProcessed: synced,
        pages,
        lastIgdbId: afterId,
      });

      if (page.length < 500) break;
    }

    const truncated = pages >= maxPages;
    await finishSyncRun(db, runId, {
      status: "success",
      rowsProcessed: synced,
      pages,
      lastIgdbId: afterId,
    });

    return { synced, pages, lastId: afterId, truncated, runId, sinceUnix };
  } catch (error) {
    await finishSyncRun(db, runId, {
      status: "error",
      rowsProcessed: synced,
      pages,
      lastIgdbId: afterId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getBackfillResumeInfo(
  db: Db,
  options: { year?: number } = {},
): Promise<{
  afterId: number;
  canContinue: boolean;
  year: number | null;
}> {
  const year = options.year ?? null;
  const yearFilter =
    year == null
      ? sql`(${syncRuns.scope}->>'year') is null`
      : sql`(${syncRuns.scope}->>'year')::int = ${year}`;

  const [row] = await db
    .select({
      status: syncRuns.status,
      pages: syncRuns.pages,
      lastIgdbId: syncRuns.lastIgdbId,
      scope: syncRuns.scope,
    })
    .from(syncRuns)
    .where(and(eq(syncRuns.kind, "backfill"), yearFilter))
    .orderBy(desc(syncRuns.startedAt))
    .limit(1);

  if (!row?.lastIgdbId) {
    return evaluateBackfillResume(null, { year });
  }

  return evaluateBackfillResume(
    {
      status: row.status,
      pages: row.pages,
      lastIgdbId: row.lastIgdbId,
      scope: row.scope as {
        maxPages?: number;
        truncated?: boolean;
      } | null,
    },
    { year },
  );
}

export type EnrichEntity =
  | "covers"
  | "platforms"
  | "genres"
  | "themes"
  | "keywords"
  | "game_types"
  | "involved_companies"
  | "companies"
  | "ttb";

export async function runEnrich(
  db: Db,
  entity: EnrichEntity,
  options: { year?: number } = {},
): Promise<{ fetched: number; runId: string }> {
  const runId = await startSyncRun(db, `enrich_${entity}`, {
    year: options.year ?? null,
  });
  const y = yearEq(options.year);

  try {
    let fetched = 0;
    let pages = 0;

    if (entity === "covers") {
      const neededRows = await db
        .selectDistinct({ id: games.coverIgdbId })
        .from(games)
        .where(and(isNotNull(games.coverIgdbId), y));
      const needed = neededRows
        .map((r) => r.id)
        .filter((id): id is number => id != null);
      fetched = await upsertMissing(
        needed,
        () => db.select({ igdbId: covers.igdbId }).from(covers),
        async (missing) => {
          const rows = await fetchByIds<{
            id: number;
            image_id?: string;
            url?: string;
            width?: number;
            height?: number;
          }>("covers", missing, "id, image_id, url, width, height");
          await insertChunked(
            rows.map((r) => ({
              igdbId: r.id,
              imageId: r.image_id ?? null,
              url: r.url ?? null,
              width: r.width ?? null,
              height: r.height ?? null,
              syncedAt: new Date(),
            })),
            (chunk) =>
              db
                .insert(covers)
                .values(chunk)
                .onConflictDoUpdate({
                  target: covers.igdbId,
                  set: {
                    imageId: sql`excluded.image_id`,
                    url: sql`excluded.url`,
                    width: sql`excluded.width`,
                    height: sql`excluded.height`,
                    syncedAt: sql`now()`,
                  },
                }),
          );
          return rows.length;
        },
      );
    } else if (entity === "platforms") {
      const neededRows = await db
        .selectDistinct({ id: gamePlatforms.platformIgdbId })
        .from(gamePlatforms)
        .innerJoin(games, eq(games.id, gamePlatforms.gameId))
        .where(y);
      fetched = await upsertMissing(
        neededRows.map((r) => r.id),
        () => db.select({ igdbId: platforms.igdbId }).from(platforms),
        async (missing) => {
          const rows = await fetchByIds<{
            id: number;
            name?: string;
            slug?: string;
            abbreviation?: string;
          }>("platforms", missing, "id, name, slug, abbreviation");
          await insertChunked(
            rows.map((r) => ({
              igdbId: r.id,
              name: r.name ?? `Platform ${r.id}`,
              slug: r.slug ?? null,
              abbreviation: r.abbreviation ?? null,
              syncedAt: new Date(),
            })),
            (chunk) =>
              db
                .insert(platforms)
                .values(chunk)
                .onConflictDoUpdate({
                  target: platforms.igdbId,
                  set: {
                    name: sql`excluded.name`,
                    slug: sql`excluded.slug`,
                    abbreviation: sql`excluded.abbreviation`,
                    syncedAt: sql`now()`,
                  },
                }),
          );
          return rows.length;
        },
      );
    } else if (entity === "genres") {
      const neededRows = await db
        .selectDistinct({ id: gameGenres.genreIgdbId })
        .from(gameGenres)
        .innerJoin(games, eq(games.id, gameGenres.gameId))
        .where(y);
      fetched = await upsertMissing(
        neededRows.map((r) => r.id),
        () => db.select({ igdbId: genres.igdbId }).from(genres),
        async (missing) => {
          const rows = await fetchByIds<{
            id: number;
            name?: string;
            slug?: string;
          }>("genres", missing, "id, name, slug");
          await insertChunked(
            rows.map((r) => ({
              igdbId: r.id,
              name: r.name ?? `Genre ${r.id}`,
              slug: r.slug ?? null,
              syncedAt: new Date(),
            })),
            (chunk) =>
              db
                .insert(genres)
                .values(chunk)
                .onConflictDoUpdate({
                  target: genres.igdbId,
                  set: {
                    name: sql`excluded.name`,
                    slug: sql`excluded.slug`,
                    syncedAt: sql`now()`,
                  },
                }),
          );
          return rows.length;
        },
      );
    } else if (entity === "themes") {
      const neededRows = await db
        .selectDistinct({ id: gameThemes.themeIgdbId })
        .from(gameThemes)
        .innerJoin(games, eq(games.id, gameThemes.gameId))
        .where(y);
      fetched = await upsertMissing(
        neededRows.map((r) => r.id),
        () => db.select({ igdbId: themes.igdbId }).from(themes),
        async (missing) => {
          const rows = await fetchByIds<{
            id: number;
            name?: string;
            slug?: string;
          }>("themes", missing, "id, name, slug");
          await insertChunked(
            rows.map((r) => ({
              igdbId: r.id,
              name: r.name ?? `Theme ${r.id}`,
              slug: r.slug ?? null,
              syncedAt: new Date(),
            })),
            (chunk) =>
              db
                .insert(themes)
                .values(chunk)
                .onConflictDoUpdate({
                  target: themes.igdbId,
                  set: {
                    name: sql`excluded.name`,
                    slug: sql`excluded.slug`,
                    syncedAt: sql`now()`,
                  },
                }),
          );
          return rows.length;
        },
      );
    } else if (entity === "keywords") {
      const neededRows = await db
        .selectDistinct({ id: gameKeywords.keywordIgdbId })
        .from(gameKeywords)
        .innerJoin(games, eq(games.id, gameKeywords.gameId))
        .where(y);
      fetched = await upsertMissing(
        neededRows.map((r) => r.id),
        () => db.select({ igdbId: keywords.igdbId }).from(keywords),
        async (missing) => {
          const rows = await fetchByIds<{
            id: number;
            name?: string;
            slug?: string;
          }>("keywords", missing, "id, name, slug");
          await insertChunked(
            rows.map((r) => ({
              igdbId: r.id,
              name: r.name ?? `Keyword ${r.id}`,
              slug: r.slug ?? null,
              syncedAt: new Date(),
            })),
            (chunk) =>
              db
                .insert(keywords)
                .values(chunk)
                .onConflictDoUpdate({
                  target: keywords.igdbId,
                  set: {
                    name: sql`excluded.name`,
                    slug: sql`excluded.slug`,
                    syncedAt: sql`now()`,
                  },
                }),
          );
          return rows.length;
        },
      );
    } else if (entity === "game_types") {
      const neededRows = await db
        .selectDistinct({ id: games.gameTypeIgdbId })
        .from(games)
        .where(and(isNotNull(games.gameTypeIgdbId), y));
      const needed = neededRows
        .map((r) => r.id)
        .filter((id): id is number => id != null);
      fetched = await upsertMissing(
        needed,
        () => db.select({ igdbId: gameTypes.igdbId }).from(gameTypes),
        async (missing) => {
          const rows = await fetchByIds<{ id: number; type?: string }>(
            "game_types",
            missing,
            "id, type",
          );
          await insertChunked(
            rows.map((r) => ({
              igdbId: r.id,
              type: r.type ?? `Type ${r.id}`,
              syncedAt: new Date(),
            })),
            (chunk) =>
              db
                .insert(gameTypes)
                .values(chunk)
                .onConflictDoUpdate({
                  target: gameTypes.igdbId,
                  set: {
                    type: sql`excluded.type`,
                    syncedAt: sql`now()`,
                  },
                }),
          );
          return rows.length;
        },
      );
    } else if (entity === "involved_companies") {
      const links = await db
        .select({
          involvedCompanyIgdbId: gameCompanies.involvedCompanyIgdbId,
        })
        .from(gameCompanies)
        .innerJoin(games, eq(games.id, gameCompanies.gameId))
        .where(and(isNull(gameCompanies.companyIgdbId), y));
      const needed = [...new Set(links.map((l) => l.involvedCompanyIgdbId))];

      for (let i = 0; i < needed.length; i += INSERT_CHUNK) {
        const idChunk = needed.slice(i, i + INSERT_CHUNK);
        const rows = await fetchByIds<{
          id: number;
          company?: number;
          developer?: boolean;
          publisher?: boolean;
          porting?: boolean;
          supporting?: boolean;
        }>(
          "involved_companies",
          idChunk,
          "id, company, developer, publisher, porting, supporting",
        );
        pages += 1;
        if (!rows.length) continue;

        const payload = rows.map((r) => ({
          involved_company_igdb_id: r.id,
          company_igdb_id: r.company ?? null,
          developer: Boolean(r.developer),
          publisher: Boolean(r.publisher),
          porting: Boolean(r.porting),
          supporting: Boolean(r.supporting),
        }));

        await db.execute(sql`
          UPDATE game_companies AS gc
          SET
            company_igdb_id = data.company_igdb_id,
            developer = data.developer,
            publisher = data.publisher,
            porting = data.porting,
            supporting = data.supporting
          FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS data(
            involved_company_igdb_id int,
            company_igdb_id int,
            developer boolean,
            publisher boolean,
            porting boolean,
            supporting boolean
          )
          WHERE gc.involved_company_igdb_id = data.involved_company_igdb_id
        `);

        fetched += rows.length;
        await updateSyncRun(db, runId, {
          rowsProcessed: fetched,
          pages,
        });
      }
    } else if (entity === "companies") {
      const neededRows = await db
        .selectDistinct({ id: gameCompanies.companyIgdbId })
        .from(gameCompanies)
        .innerJoin(games, eq(games.id, gameCompanies.gameId))
        .where(and(isNotNull(gameCompanies.companyIgdbId), y));
      const needed = neededRows
        .map((r) => r.id)
        .filter((id): id is number => id != null);
      fetched = await upsertMissing(
        needed,
        () => db.select({ igdbId: companies.igdbId }).from(companies),
        async (missing) => {
          const rows = await fetchByIds<{
            id: number;
            name?: string;
            slug?: string;
          }>("companies", missing, "id, name, slug");
          await insertChunked(
            rows.map((r) => ({
              igdbId: r.id,
              name: r.name ?? `Company ${r.id}`,
              slug: r.slug ?? null,
              syncedAt: new Date(),
            })),
            (chunk) =>
              db
                .insert(companies)
                .values(chunk)
                .onConflictDoUpdate({
                  target: companies.igdbId,
                  set: {
                    name: sql`excluded.name`,
                    slug: sql`excluded.slug`,
                    syncedAt: sql`now()`,
                  },
                }),
          );
          return rows.length;
        },
      );
    } else if (entity === "ttb") {
      const gameRows = await db
        .select({ igdbId: games.igdbId })
        .from(games)
        .where(y);
      const gameIgdbIds = gameRows.map((r) => r.igdbId);
      const existing = gameIgdbIds.length
        ? await db
            .select({ gameIgdbId: gameTimeToBeats.gameIgdbId })
            .from(gameTimeToBeats)
            .where(inArray(gameTimeToBeats.gameIgdbId, gameIgdbIds))
        : [];
      const have = new Set(existing.map((e) => e.gameIgdbId));
      const missing = gameIgdbIds.filter((id) => !have.has(id));
      const rows: {
        game_id?: number;
        hastily?: number;
        normally?: number;
        completely?: number;
      }[] = [];
      for (let i = 0; i < missing.length; i += 500) {
        const chunk = missing.slice(i, i + 500);
        if (!chunk.length) break;
        const body =
          `fields game_id, hastily, normally, completely; ` +
          `where game_id = (${chunk.join(",")}); limit 500;`;
        const batch = await igdbQuery<typeof rows>("game_time_to_beats", body);
        rows.push(...batch);
      }
      const values = rows
        .filter((r) => r.game_id != null)
        .map((r) => ({
          gameIgdbId: r.game_id!,
          hastily: r.hastily ?? null,
          normally: r.normally ?? null,
          completely: r.completely ?? null,
          syncedAt: new Date(),
        }));
      await insertChunked(values, (chunk) =>
        db
          .insert(gameTimeToBeats)
          .values(chunk)
          .onConflictDoUpdate({
            target: gameTimeToBeats.gameIgdbId,
            set: {
              hastily: sql`excluded.hastily`,
              normally: sql`excluded.normally`,
              completely: sql`excluded.completely`,
              syncedAt: sql`now()`,
            },
          }),
      );
      fetched = values.length;
    }

    await finishSyncRun(db, runId, {
      status: "success",
      rowsProcessed: fetched,
      pages: Math.max(pages, 1),
    });
    return { fetched, runId };
  } catch (error) {
    await finishSyncRun(db, runId, {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function upsertMissing(
  needed: number[],
  loadExisting: () => Promise<{ igdbId: number }[]>,
  fetchAndWrite: (missing: number[]) => Promise<number>,
): Promise<number> {
  if (needed.length === 0) return 0;
  const existing = await loadExisting();
  const have = new Set(existing.map((e) => e.igdbId));
  const missing = needed.filter((id) => !have.has(id));
  if (missing.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < missing.length; i += INSERT_CHUNK) {
    total += await fetchAndWrite(missing.slice(i, i + INSERT_CHUNK));
  }
  return total;
}

export const ALL_ENRICH_ENTITIES: EnrichEntity[] = [
  "covers",
  "platforms",
  "genres",
  "themes",
  "keywords",
  "game_types",
  "involved_companies",
  "companies",
  "ttb",
];

export async function runImportYear(
  db: Db,
  year: number,
  options: { maxPages?: number; afterId?: number } = {},
): Promise<{
  backfill: SyncChunkResult;
  enrich: Record<string, number>;
}> {
  let afterId = options.afterId ?? 0;
  if (options.afterId == null) {
    const resume = await getBackfillResumeInfo(db, { year });
    if (resume.canContinue) {
      afterId = resume.afterId;
    }
  }

  let lastBackfill: SyncChunkResult | null = null;
  do {
    lastBackfill = await runBackfillSync(db, {
      year,
      afterId,
      maxPages: options.maxPages ?? MAX_PAGES_PER_RUN,
    });
    afterId = lastBackfill.lastId;
  } while (lastBackfill.truncated);

  const enrich: Record<string, number> = {};
  for (const entity of ALL_ENRICH_ENTITIES) {
    const result = await runEnrich(db, entity, { year });
    enrich[entity] = result.fetched;
  }

  return { backfill: lastBackfill, enrich };
}
