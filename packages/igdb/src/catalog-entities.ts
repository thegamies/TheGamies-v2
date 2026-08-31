import { inArray, sql } from "drizzle-orm";
import type { Db } from "@thegamies/db";
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
} from "@thegamies/db";
import {
  GAME_FIELDS,
  fetchEntityPage,
  mapIgdbGame,
  resolveAdultFilters,
  type IgdbGame,
} from "./client";
import { insertChunked } from "./chunk";
import {
  ARTWORK_FIELDS,
  COVER_FIELDS,
  GAME_VIDEO_FIELDS,
  IMAGE_TYPE_FIELDS,
  SCREENSHOT_FIELDS,
  mapArtworkRow,
  mapCoverRow,
  mapGameVideoRow,
  mapImageTypeRow,
  mapScreenshotRow,
  type IgdbArtworkRow,
  type IgdbCoverRow,
  type IgdbGameVideoRow,
  type IgdbImageTypeRow,
  type IgdbScreenshotRow,
} from "./igdb-media";
import { upsertGamesWithLinks } from "./upsert-games";

export type CatalogEntity =
  | "image_types"
  | "platforms"
  | "genres"
  | "themes"
  | "keywords"
  | "game_types"
  | "companies"
  | "games"
  | "covers"
  | "artworks"
  | "screenshots"
  | "game_videos"
  | "involved_companies"
  | "ttb";

export const CATALOG_ENTITY_ORDER: CatalogEntity[] = [
  "image_types",
  "platforms",
  "genres",
  "themes",
  "keywords",
  "game_types",
  "companies",
  "games",
  "covers",
  "artworks",
  "screenshots",
  "game_videos",
  "involved_companies",
  "ttb",
];

export function isCatalogEntity(value: string): value is CatalogEntity {
  return (CATALOG_ENTITY_ORDER as string[]).includes(value);
}

export function nextCatalogEntity(
  completed: readonly CatalogEntity[],
): CatalogEntity | null {
  return CATALOG_ENTITY_ORDER.find((entity) => !completed.includes(entity)) ?? null;
}

export function catalogRunKind(
  mode: "catalog" | "updated",
  entity: CatalogEntity | "all",
): string {
  return `${mode}_${entity}`;
}

const NAMED_FIELDS = "id, name, slug, updated_at";
const PLATFORM_FIELDS = "id, name, slug, abbreviation, updated_at";
const GAME_TYPE_FIELDS = "id, type, updated_at";
const INVOLVED_FIELDS =
  "id, company, game, developer, publisher, porting, supporting, updated_at";
const TTB_FIELDS = "id, game_id, hastily, normally, completely, updated_at";

export type IgdbNamedRow = {
  id: number;
  name?: string;
  slug?: string;
};

export type IgdbPlatformRow = IgdbNamedRow & { abbreviation?: string };

export type IgdbGameTypeRow = { id: number; type?: string };

export type IgdbInvolvedCompanyRow = {
  id: number;
  company?: number;
  game?: number;
  developer?: boolean;
  publisher?: boolean;
  porting?: boolean;
  supporting?: boolean;
};

export type IgdbTtbRow = {
  id: number;
  game_id?: number;
  hastily?: number;
  normally?: number;
  completely?: number;
};

export function involvedCompaniesForKnownGames(
  rows: IgdbInvolvedCompanyRow[],
  knownGameIgdbIds: Set<number>,
): IgdbInvolvedCompanyRow[] {
  return rows.filter(
    (row) => row.game != null && knownGameIgdbIds.has(row.game),
  );
}

export function ttbRowsForKnownGames(
  rows: IgdbTtbRow[],
  knownGameIgdbIds: Set<number>,
): IgdbTtbRow[] {
  return rows.filter(
    (row) => row.game_id != null && knownGameIgdbIds.has(row.game_id),
  );
}

type EntitySpec = {
  endpoint: string;
  fields: string;
};

const SPECS: Record<CatalogEntity, EntitySpec> = {
  image_types: { endpoint: "image_types", fields: IMAGE_TYPE_FIELDS },
  platforms: { endpoint: "platforms", fields: PLATFORM_FIELDS },
  genres: { endpoint: "genres", fields: NAMED_FIELDS },
  themes: { endpoint: "themes", fields: NAMED_FIELDS },
  keywords: { endpoint: "keywords", fields: NAMED_FIELDS },
  game_types: { endpoint: "game_types", fields: GAME_TYPE_FIELDS },
  companies: { endpoint: "companies", fields: NAMED_FIELDS },
  games: { endpoint: "games", fields: GAME_FIELDS },
  covers: { endpoint: "covers", fields: COVER_FIELDS },
  artworks: { endpoint: "artworks", fields: ARTWORK_FIELDS },
  screenshots: { endpoint: "screenshots", fields: SCREENSHOT_FIELDS },
  game_videos: { endpoint: "game_videos", fields: GAME_VIDEO_FIELDS },
  involved_companies: {
    endpoint: "involved_companies",
    fields: INVOLVED_FIELDS,
  },
  ttb: { endpoint: "game_time_to_beats", fields: TTB_FIELDS },
};

export function catalogEntitySpec(entity: CatalogEntity): EntitySpec {
  return SPECS[entity];
}

export async function fetchCatalogEntityPage(
  entity: CatalogEntity,
  options: { afterId: number; limit?: number; sinceUnix?: number },
): Promise<{ id: number }[]> {
  const spec = SPECS[entity];
  return fetchEntityPage({
    endpoint: spec.endpoint,
    fields: spec.fields,
    afterId: options.afterId,
    limit: options.limit,
    sinceUnix: options.sinceUnix,
  });
}

async function gameIdByIgdbId(
  db: Db,
  igdbIds: number[],
): Promise<Map<number, string>> {
  const unique = [...new Set(igdbIds.filter((id) => Number.isFinite(id)))];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ id: games.id, igdbId: games.igdbId })
    .from(games)
    .where(inArray(games.igdbId, unique));
  return new Map(rows.map((row) => [row.igdbId, row.id]));
}

async function knownGameIgdbIds(db: Db, igdbIds: number[]): Promise<Set<number>> {
  const map = await gameIdByIgdbId(db, igdbIds);
  return new Set(map.keys());
}

async function upsertNamed(
  db: Db,
  table: typeof genres | typeof themes | typeof keywords | typeof companies,
  rows: IgdbNamedRow[],
  fallback: string,
): Promise<void> {
  await insertChunked(
    rows.map((row) => ({
      igdbId: row.id,
      name: row.name ?? `${fallback} ${row.id}`,
      slug: row.slug ?? null,
      syncedAt: new Date(),
    })),
    (chunk) =>
      db
        .insert(table)
        .values(chunk)
        .onConflictDoUpdate({
          target: table.igdbId,
          set: {
            name: sql`excluded.name`,
            slug: sql`excluded.slug`,
            syncedAt: sql`now()`,
          },
        }),
  );
}

export async function upsertCatalogPage(
  db: Db,
  entity: CatalogEntity,
  page: { id: number }[],
): Promise<number> {
  if (page.length === 0) return 0;

  switch (entity) {
    case "games": {
      const filters = await resolveAdultFilters();
      const rows = (page as IgdbGame[])
        .map((game) => mapIgdbGame(game, filters))
        .filter((row): row is NonNullable<typeof row> => row !== null);
      await upsertGamesWithLinks(db, rows);
      return rows.length;
    }
    case "covers": {
      const rows = (page as IgdbCoverRow[]).map(mapCoverRow);
      await insertChunked(rows, (chunk) =>
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
              alphaChannel: sql`excluded.alpha_channel`,
              animated: sql`excluded.animated`,
              checksum: sql`excluded.checksum`,
              gameIgdbId: sql`excluded.game_igdb_id`,
              gameLocalizationIgdbId: sql`excluded.game_localization_igdb_id`,
              imageTypeIgdbId: sql`excluded.image_type_igdb_id`,
              syncedAt: sql`now()`,
            },
          }),
      );
      return rows.length;
    }
    case "artworks": {
      const rows = (page as IgdbArtworkRow[]).map(mapArtworkRow);
      await insertChunked(rows, (chunk) =>
        db
          .insert(artworks)
          .values(chunk)
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
          }),
      );
      const gameMap = await gameIdByIgdbId(
        db,
        rows
          .map((row) => row.gameIgdbId)
          .filter((id): id is number => id != null),
      );
      const links = rows.flatMap((row) => {
        const gameId =
          row.gameIgdbId != null ? gameMap.get(row.gameIgdbId) : undefined;
        return gameId
          ? [{ gameId, artworkIgdbId: row.igdbId }]
          : [];
      });
      if (links.length) {
        await insertChunked(links, (chunk) =>
          db.insert(gameArtworks).values(chunk).onConflictDoNothing(),
        );
      }
      return rows.length;
    }
    case "screenshots": {
      const rows = (page as IgdbScreenshotRow[]).map(mapScreenshotRow);
      await insertChunked(rows, (chunk) =>
        db
          .insert(screenshots)
          .values(chunk)
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
          }),
      );
      const gameMap = await gameIdByIgdbId(
        db,
        rows
          .map((row) => row.gameIgdbId)
          .filter((id): id is number => id != null),
      );
      const links = rows.flatMap((row) => {
        const gameId =
          row.gameIgdbId != null ? gameMap.get(row.gameIgdbId) : undefined;
        return gameId
          ? [{ gameId, screenshotIgdbId: row.igdbId }]
          : [];
      });
      if (links.length) {
        await insertChunked(links, (chunk) =>
          db.insert(gameScreenshots).values(chunk).onConflictDoNothing(),
        );
      }
      return rows.length;
    }
    case "game_videos": {
      const rows = (page as IgdbGameVideoRow[]).map(mapGameVideoRow);
      await insertChunked(rows, (chunk) =>
        db
          .insert(gameVideos)
          .values(chunk)
          .onConflictDoUpdate({
            target: gameVideos.igdbId,
            set: {
              checksum: sql`excluded.checksum`,
              gameIgdbId: sql`excluded.game_igdb_id`,
              name: sql`excluded.name`,
              videoId: sql`excluded.video_id`,
              syncedAt: sql`now()`,
            },
          }),
      );
      const gameMap = await gameIdByIgdbId(
        db,
        rows
          .map((row) => row.gameIgdbId)
          .filter((id): id is number => id != null),
      );
      const links = rows.flatMap((row) => {
        const gameId =
          row.gameIgdbId != null ? gameMap.get(row.gameIgdbId) : undefined;
        return gameId ? [{ gameId, videoIgdbId: row.igdbId }] : [];
      });
      if (links.length) {
        await insertChunked(links, (chunk) =>
          db.insert(gameVideoLinks).values(chunk).onConflictDoNothing(),
        );
      }
      return rows.length;
    }
    case "image_types": {
      const rows = (page as IgdbImageTypeRow[]).map(mapImageTypeRow);
      await insertChunked(rows, (chunk) =>
        db
          .insert(imageTypes)
          .values(chunk)
          .onConflictDoUpdate({
            target: imageTypes.igdbId,
            set: {
              name: sql`excluded.name`,
              checksum: sql`excluded.checksum`,
              igdbCreatedAt: sql`excluded.igdb_created_at`,
              igdbUpdatedAt: sql`excluded.igdb_updated_at`,
              syncedAt: sql`now()`,
            },
          }),
      );
      return rows.length;
    }
    case "platforms": {
      const rows = page as IgdbPlatformRow[];
      await insertChunked(
        rows.map((row) => ({
          igdbId: row.id,
          name: row.name ?? `Platform ${row.id}`,
          slug: row.slug ?? null,
          abbreviation: row.abbreviation ?? null,
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
    }
    case "genres":
      await upsertNamed(db, genres, page as IgdbNamedRow[], "Genre");
      return page.length;
    case "themes":
      await upsertNamed(db, themes, page as IgdbNamedRow[], "Theme");
      return page.length;
    case "keywords":
      await upsertNamed(db, keywords, page as IgdbNamedRow[], "Keyword");
      return page.length;
    case "companies":
      await upsertNamed(db, companies, page as IgdbNamedRow[], "Company");
      return page.length;
    case "game_types": {
      const rows = page as IgdbGameTypeRow[];
      await insertChunked(
        rows.map((row) => ({
          igdbId: row.id,
          type: row.type ?? `Type ${row.id}`,
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
    }
    case "involved_companies": {
      const raw = page as IgdbInvolvedCompanyRow[];
      const known = await knownGameIgdbIds(
        db,
        raw.map((row) => row.game).filter((id): id is number => id != null),
      );
      const keep = involvedCompaniesForKnownGames(raw, known);
      if (keep.length === 0) return 0;
      const gameMap = await gameIdByIgdbId(
        db,
        keep.map((row) => row.game!).filter((id) => id != null),
      );
      const values = keep.flatMap((row) => {
        const gameId = row.game != null ? gameMap.get(row.game) : undefined;
        if (!gameId) return [];
        return [
          {
            gameId,
            involvedCompanyIgdbId: row.id,
            companyIgdbId: row.company ?? null,
            developer: Boolean(row.developer),
            publisher: Boolean(row.publisher),
            porting: Boolean(row.porting),
            supporting: Boolean(row.supporting),
          },
        ];
      });
      if (values.length) {
        await insertChunked(values, (chunk) =>
          db
            .insert(gameCompanies)
            .values(chunk)
            .onConflictDoUpdate({
              target: [gameCompanies.gameId, gameCompanies.involvedCompanyIgdbId],
              set: {
                companyIgdbId: sql`excluded.company_igdb_id`,
                developer: sql`excluded.developer`,
                publisher: sql`excluded.publisher`,
                porting: sql`excluded.porting`,
                supporting: sql`excluded.supporting`,
              },
            }),
        );
      }
      return values.length;
    }
    case "ttb": {
      const raw = page as IgdbTtbRow[];
      const known = await knownGameIgdbIds(
        db,
        raw.map((row) => row.game_id).filter((id): id is number => id != null),
      );
      const keep = ttbRowsForKnownGames(raw, known);
      if (keep.length === 0) return 0;
      await insertChunked(
        keep.map((row) => ({
          gameIgdbId: row.game_id!,
          hastily: row.hastily ?? null,
          normally: row.normally ?? null,
          completely: row.completely ?? null,
          syncedAt: new Date(),
        })),
        (chunk) =>
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
      return keep.length;
    }
    default: {
      const _never: never = entity;
      throw new Error(`Unsupported catalog entity: ${_never}`);
    }
  }
}
