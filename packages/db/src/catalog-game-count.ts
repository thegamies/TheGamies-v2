import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "./client";
import { games, siteSettings } from "./schema";

export const SITE_SETTINGS_ID = "default";

/** Non-adult catalog rows that are still listed — the default `/games` pager total. */
export async function countListedCatalogGames(db: Db): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(games)
    .where(and(isNull(games.igdbRemovedAt), eq(games.isAdult, false)));
  return Number(row?.n ?? 0);
}

export async function readCatalogGameCount(db: Db): Promise<number | null> {
  const [row] = await db
    .select({ catalogGameCount: siteSettings.catalogGameCount })
    .from(siteSettings)
    .where(eq(siteSettings.id, SITE_SETTINGS_ID))
    .limit(1);
  const n = row?.catalogGameCount;
  if (n == null || !Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** Recount listed catalog games into `site_settings`. Call after IGDB game upserts. */
export async function refreshCatalogGameCount(db: Db): Promise<number> {
  const catalogGameCount = await countListedCatalogGames(db);
  await db
    .insert(siteSettings)
    .values({
      id: SITE_SETTINGS_ID,
      catalogGameCount,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        catalogGameCount,
        updatedAt: new Date(),
      },
    });
  return catalogGameCount;
}
