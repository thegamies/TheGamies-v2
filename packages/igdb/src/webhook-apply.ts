import { eq, sql } from "drizzle-orm";
import {
  artworks,
  companies,
  covers,
  gameArtworks,
  gameCompanies,
  games,
  gameScreenshots,
  gameTimeToBeats,
  gameTypes,
  gameVideoLinks,
  gameVideos,
  genres,
  imageTypes,
  keywords,
  platforms,
  screenshots,
  themes,
  type Db,
} from "@thegamies/db";
import {
  mapIgdbGame,
  resolveAdultFilters,
} from "./client";
import { upsertGamesWithLinks } from "./upsert-games";
import {
  mapArtworkRow,
  mapCoverRow,
  mapGameVideoRow,
  mapImageTypeRow,
  mapScreenshotRow,
} from "./igdb-media";
import {
  assertIgdbArtwork,
  assertIgdbCompany,
  assertIgdbCover,
  assertIgdbGame,
  assertIgdbGameTimeToBeat,
  assertIgdbGameType,
  assertIgdbGameVideo,
  assertIgdbGenre,
  assertIgdbImageType,
  assertIgdbInvolvedCompany,
  assertIgdbKeyword,
  assertIgdbPlatform,
  assertIgdbScreenshot,
  assertIgdbTheme,
  parseDeleteIgdbIdFromPayload,
} from "./webhook-apply-parsers";
import type { WebhookEntity, WebhookMethod } from "./webhook-routing";

export {
  assertIgdbArtwork,
  assertIgdbCompany,
  assertIgdbCover,
  assertIgdbGame,
  assertIgdbGameTimeToBeat,
  assertIgdbGameType,
  assertIgdbGameVideo,
  assertIgdbGenre,
  assertIgdbImageType,
  assertIgdbInvolvedCompany,
  assertIgdbKeyword,
  assertIgdbPlatform,
  assertIgdbScreenshot,
  assertIgdbTheme,
  parseDeleteIgdbIdFromPayload as parseDeleteIgdbId,
} from "./webhook-apply-parsers";

async function softDelistGame(db: Db, igdbId: number): Promise<void> {
  await db
    .update(games)
    .set({ igdbRemovedAt: new Date(), updatedAt: new Date() })
    .where(eq(games.igdbId, igdbId));
}

export async function applyGameCreateUpdates(
  db: Db,
  payloads: unknown[],
): Promise<void> {
  if (payloads.length === 0) return;
  const filters = await resolveAdultFilters();
  const mapped = [];
  for (const payload of payloads) {
    const game = assertIgdbGame(payload);
    const row = mapIgdbGame(game, filters);
    if (!row) {
      throw new Error("Webhook game payload missing name");
    }
    mapped.push(row);
  }
  await upsertGamesWithLinks(db, mapped);
}

async function applyGameCreateUpdate(db: Db, payload: unknown): Promise<void> {
  await applyGameCreateUpdates(db, [payload]);
}

async function applyCover(db: Db, payload: unknown): Promise<void> {
  const cover = assertIgdbCover(payload);
  const row = mapCoverRow(cover);
  await db
    .insert(covers)
    .values(row)
    .onConflictDoUpdate({
      target: covers.igdbId,
      set: {
        imageId: sql`excluded.image_id`,
        url: sql`excluded.url`,
        width: sql`excluded.width`,
        height: sql`excluded.height`,
        alphaChannel: sql`excluded.alpha_channel`,
        animated: sql`excluded.animated`,
        checksum: sql`excluded.checksum`,
        gameIgdbId: sql`excluded.game_igdb_id`,
        gameLocalizationIgdbId: sql`excluded.game_localization_igdb_id`,
        imageTypeIgdbId: sql`excluded.image_type_igdb_id`,
        syncedAt: sql`now()`,
      },
    });
}

async function linkMedia(
  db: Db,
  gameIgdbId: number | null | undefined,
  insert: (gameId: string) => Promise<void>,
): Promise<void> {
  if (gameIgdbId == null) return;
  const [game] = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.igdbId, gameIgdbId))
    .limit(1);
  if (!game) return;
  await insert(game.id);
}

async function applyArtwork(db: Db, payload: unknown): Promise<void> {
  const parsed = assertIgdbArtwork(payload);
  const row = mapArtworkRow(parsed);
  await db
    .insert(artworks)
    .values(row)
    .onConflictDoUpdate({
      target: artworks.igdbId,
      set: {
        alphaChannel: sql`excluded.alpha_channel`,
        animated: sql`excluded.animated`,
        checksum: sql`excluded.checksum`,
        gameIgdbId: sql`excluded.game_igdb_id`,
        height: sql`excluded.height`,
        imageId: sql`excluded.image_id`,
        imageTypeIgdbId: sql`excluded.image_type_igdb_id`,
        url: sql`excluded.url`,
        width: sql`excluded.width`,
        syncedAt: sql`now()`,
      },
    });
  await linkMedia(db, row.gameIgdbId, async (gameId) => {
    await db
      .insert(gameArtworks)
      .values({ gameId, artworkIgdbId: row.igdbId })
      .onConflictDoNothing();
  });
}

async function applyScreenshot(db: Db, payload: unknown): Promise<void> {
  const parsed = assertIgdbScreenshot(payload);
  const row = mapScreenshotRow(parsed);
  await db
    .insert(screenshots)
    .values(row)
    .onConflictDoUpdate({
      target: screenshots.igdbId,
      set: {
        alphaChannel: sql`excluded.alpha_channel`,
        animated: sql`excluded.animated`,
        checksum: sql`excluded.checksum`,
        gameIgdbId: sql`excluded.game_igdb_id`,
        height: sql`excluded.height`,
        imageId: sql`excluded.image_id`,
        url: sql`excluded.url`,
        width: sql`excluded.width`,
        syncedAt: sql`now()`,
      },
    });
  await linkMedia(db, row.gameIgdbId, async (gameId) => {
    await db
      .insert(gameScreenshots)
      .values({ gameId, screenshotIgdbId: row.igdbId })
      .onConflictDoNothing();
  });
}

async function applyGameVideo(db: Db, payload: unknown): Promise<void> {
  const parsed = assertIgdbGameVideo(payload);
  const row = mapGameVideoRow(parsed);
  await db
    .insert(gameVideos)
    .values(row)
    .onConflictDoUpdate({
      target: gameVideos.igdbId,
      set: {
        checksum: sql`excluded.checksum`,
        gameIgdbId: sql`excluded.game_igdb_id`,
        name: sql`excluded.name`,
        videoId: sql`excluded.video_id`,
        syncedAt: sql`now()`,
      },
    });
  await linkMedia(db, row.gameIgdbId, async (gameId) => {
    await db
      .insert(gameVideoLinks)
      .values({ gameId, videoIgdbId: row.igdbId })
      .onConflictDoNothing();
  });
}

async function applyImageType(db: Db, payload: unknown): Promise<void> {
  const parsed = assertIgdbImageType(payload);
  const row = mapImageTypeRow(parsed);
  await db
    .insert(imageTypes)
    .values(row)
    .onConflictDoUpdate({
      target: imageTypes.igdbId,
      set: {
        name: sql`excluded.name`,
        checksum: sql`excluded.checksum`,
        igdbCreatedAt: sql`excluded.igdb_created_at`,
        igdbUpdatedAt: sql`excluded.igdb_updated_at`,
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
    case "artworks":
      await db.delete(gameArtworks).where(eq(gameArtworks.artworkIgdbId, igdbId));
      await db.delete(artworks).where(eq(artworks.igdbId, igdbId));
      return;
    case "screenshots":
      await db
        .delete(gameScreenshots)
        .where(eq(gameScreenshots.screenshotIgdbId, igdbId));
      await db.delete(screenshots).where(eq(screenshots.igdbId, igdbId));
      return;
    case "game_videos":
      await db
        .delete(gameVideoLinks)
        .where(eq(gameVideoLinks.videoIgdbId, igdbId));
      await db.delete(gameVideos).where(eq(gameVideos.igdbId, igdbId));
      return;
    case "image_types":
      await db.delete(imageTypes).where(eq(imageTypes.igdbId, igdbId));
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
    case "artworks":
      await applyArtwork(db, payload);
      return;
    case "screenshots":
      await applyScreenshot(db, payload);
      return;
    case "game_videos":
      await applyGameVideo(db, payload);
      return;
    case "image_types":
      await applyImageType(db, payload);
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
