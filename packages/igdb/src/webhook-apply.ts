import { eq, sql } from "drizzle-orm";
import type { Db } from "@thegamies/db";
import {
  companies,
  covers,
  gameCompanies,
  games,
  gameTimeToBeats,
  gameTypes,
  genres,
  keywords,
  platforms,
  themes,
} from "@thegamies/db/schema";
import {
  mapIgdbGame,
  resolveAdultFilters,
} from "./client";
import { upsertGamesWithLinks } from "./upsert-games";
import {
  assertIgdbCompany,
  assertIgdbCover,
  assertIgdbGame,
  assertIgdbGameTimeToBeat,
  assertIgdbGameType,
  assertIgdbGenre,
  assertIgdbInvolvedCompany,
  assertIgdbKeyword,
  assertIgdbPlatform,
  assertIgdbTheme,
  parseDeleteIgdbIdFromPayload,
} from "./webhook-apply-parsers";
import type { WebhookEntity, WebhookMethod } from "./webhook-routing";

export {
  assertIgdbCompany,
  assertIgdbCover,
  assertIgdbGame,
  assertIgdbGameTimeToBeat,
  assertIgdbGameType,
  assertIgdbGenre,
  assertIgdbInvolvedCompany,
  assertIgdbKeyword,
  assertIgdbPlatform,
  assertIgdbTheme,
  parseDeleteIgdbIdFromPayload as parseDeleteIgdbId,
} from "./webhook-apply-parsers";

async function softDelistGame(db: Db, igdbId: number): Promise<void> {
  await db
    .update(games)
    .set({ igdbRemovedAt: new Date(), updatedAt: new Date() })
    .where(eq(games.igdbId, igdbId));
}

async function clearGameRemovedAt(db: Db, igdbId: number): Promise<void> {
  await db
    .update(games)
    .set({ igdbRemovedAt: null, updatedAt: new Date() })
    .where(eq(games.igdbId, igdbId));
}

async function applyGameCreateUpdate(db: Db, payload: unknown): Promise<void> {
  const game = assertIgdbGame(payload);
  const filters = await resolveAdultFilters();
  const mapped = mapIgdbGame(game, filters);
  if (!mapped) {
    throw new Error("Webhook game payload missing name");
  }
  await upsertGamesWithLinks(db, [mapped]);
  await clearGameRemovedAt(db, mapped.igdbId);
}

async function applyCover(db: Db, payload: unknown): Promise<void> {
  const cover = assertIgdbCover(payload);
  await db
    .insert(covers)
    .values({
      igdbId: cover.id,
      imageId: cover.image_id ?? null,
      url: cover.url ?? null,
      width: cover.width ?? null,
      height: cover.height ?? null,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: covers.igdbId,
      set: {
        imageId: sql`excluded.image_id`,
        url: sql`excluded.url`,
        width: sql`excluded.width`,
        height: sql`excluded.height`,
        syncedAt: sql`now()`,
      },
    });
}

async function applyPlatform(db: Db, payload: unknown): Promise<void> {
  const row = assertIgdbPlatform(payload);
  await db
    .insert(platforms)
    .values({
      igdbId: row.id,
      name: row.name ?? `Platform ${row.id}`,
      slug: row.slug ?? null,
      abbreviation: row.abbreviation ?? null,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platforms.igdbId,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        abbreviation: sql`excluded.abbreviation`,
        syncedAt: sql`now()`,
      },
    });
}

async function applyNamedTable(
  db: Db,
  table: typeof genres | typeof themes | typeof keywords | typeof companies,
  payload: unknown,
  fallback: string,
  assertFn: (payload: unknown) => { id: number; name?: string; slug?: string },
): Promise<void> {
  const row = assertFn(payload);
  await db
    .insert(table)
    .values({
      igdbId: row.id,
      name: row.name ?? `${fallback} ${row.id}`,
      slug: row.slug ?? null,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: table.igdbId,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        syncedAt: sql`now()`,
      },
    });
}

async function applyGameType(db: Db, payload: unknown): Promise<void> {
  const row = assertIgdbGameType(payload);
  await db
    .insert(gameTypes)
    .values({
      igdbId: row.id,
      type: row.type ?? `Type ${row.id}`,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: gameTypes.igdbId,
      set: {
        type: sql`excluded.type`,
        syncedAt: sql`now()`,
      },
    });
}

async function applyInvolvedCompany(db: Db, payload: unknown): Promise<void> {
  const row = assertIgdbInvolvedCompany(payload);
  if (row.game == null) {
    throw new Error("Involved company webhook missing game id");
  }

  const [game] = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.igdbId, row.game))
    .limit(1);

  if (!game) {
    throw new Error(
      `Involved company references unknown game igdb_id ${row.game}`,
    );
  }

  await db
    .insert(gameCompanies)
    .values({
      gameId: game.id,
      involvedCompanyIgdbId: row.id,
      companyIgdbId: row.company ?? null,
      developer: Boolean(row.developer),
      publisher: Boolean(row.publisher),
      porting: Boolean(row.porting),
      supporting: Boolean(row.supporting),
    })
    .onConflictDoUpdate({
      target: [gameCompanies.gameId, gameCompanies.involvedCompanyIgdbId],
      set: {
        companyIgdbId: sql`excluded.company_igdb_id`,
        developer: sql`excluded.developer`,
        publisher: sql`excluded.publisher`,
        porting: sql`excluded.porting`,
        supporting: sql`excluded.supporting`,
      },
    });
}

async function applyTimeToBeat(db: Db, payload: unknown): Promise<void> {
  const row = assertIgdbGameTimeToBeat(payload);
  if (row.game_id == null) {
    throw new Error("Time-to-beat webhook missing game_id");
  }
  await db
    .insert(gameTimeToBeats)
    .values({
      gameIgdbId: row.game_id,
      hastily: row.hastily ?? null,
      normally: row.normally ?? null,
      completely: row.completely ?? null,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: gameTimeToBeats.gameIgdbId,
      set: {
        hastily: sql`excluded.hastily`,
        normally: sql`excluded.normally`,
        completely: sql`excluded.completely`,
        syncedAt: sql`now()`,
      },
    });
}

async function deleteByEntity(
  db: Db,
  entity: WebhookEntity,
  igdbId: number,
  payload: unknown,
): Promise<void> {
  switch (entity) {
    case "games":
      await softDelistGame(db, igdbId);
      return;
    case "covers":
      await db.delete(covers).where(eq(covers.igdbId, igdbId));
      return;
    case "platforms":
      await db.delete(platforms).where(eq(platforms.igdbId, igdbId));
      return;
    case "keywords":
      await db.delete(keywords).where(eq(keywords.igdbId, igdbId));
      return;
    case "themes":
      await db.delete(themes).where(eq(themes.igdbId, igdbId));
      return;
    case "game_types":
      await db.delete(gameTypes).where(eq(gameTypes.igdbId, igdbId));
      return;
    case "genres":
      await db.delete(genres).where(eq(genres.igdbId, igdbId));
      return;
    case "companies":
      await db.delete(companies).where(eq(companies.igdbId, igdbId));
      return;
    case "involved_companies":
      await db
        .delete(gameCompanies)
        .where(eq(gameCompanies.involvedCompanyIgdbId, igdbId));
      return;
    case "game_time_to_beats": {
      const record =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : {};
      const gameId =
        typeof record.game_id === "number" ? record.game_id : null;
      if (gameId == null) {
        throw new Error(
          "Time-to-beat delete needs game_id (local table is keyed by game)",
        );
      }
      await db
        .delete(gameTimeToBeats)
        .where(eq(gameTimeToBeats.gameIgdbId, gameId));
      return;
    }
    default:
      throw new Error(`Unsupported webhook entity: ${entity}`);
  }
}

export async function applyWebhook(
  db: Db,
  entity: WebhookEntity,
  method: WebhookMethod,
  payload: unknown,
): Promise<void> {
  if (method === "delete") {
    const igdbId = parseDeleteIgdbIdFromPayload(payload);
    await deleteByEntity(db, entity, igdbId, payload);
    return;
  }

  if (method !== "create" && method !== "update") {
    throw new Error(`Unsupported webhook method: ${method}`);
  }

  switch (entity) {
    case "games":
      await applyGameCreateUpdate(db, payload);
      return;
    case "covers":
      await applyCover(db, payload);
      return;
    case "platforms":
      await applyPlatform(db, payload);
      return;
    case "keywords":
      await applyNamedTable(db, keywords, payload, "Keyword", assertIgdbKeyword);
      return;
    case "themes":
      await applyNamedTable(db, themes, payload, "Theme", assertIgdbTheme);
      return;
    case "genres":
      await applyNamedTable(db, genres, payload, "Genre", assertIgdbGenre);
      return;
    case "companies":
      await applyNamedTable(db, companies, payload, "Company", assertIgdbCompany);
      return;
    case "game_types":
      await applyGameType(db, payload);
      return;
    case "involved_companies":
      await applyInvolvedCompany(db, payload);
      return;
    case "game_time_to_beats":
      await applyTimeToBeat(db, payload);
      return;
    default:
      throw new Error(`Unsupported webhook entity: ${entity}`);
  }
}
