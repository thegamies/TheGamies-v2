import { eq } from "drizzle-orm";
import { createDb, siteSettings, type Db } from "@thegamies/db";
import {
  parseSharedRankMode,
  type SharedRankMode,
} from "@/lib/standings/shared-rank";
import { resolveLandingStandingsYears } from "./landing-years";

export {
  defaultLandingStandingsYears,
  parseLandingYearsInput,
  resolveLandingStandingsYears,
} from "./landing-years";

const SETTINGS_ID = "default";

function getDb(): Db {
  return createDb();
}

export type SiteSettingsRow = {
  landingStandingsYears: number[] | null;
  rankMode: SharedRankMode;
};

export async function getSiteSettings(
  db: Db = getDb(),
): Promise<SiteSettingsRow> {
  const [row] = await db
    .select({
      landingStandingsYears: siteSettings.landingStandingsYears,
      rankMode: siteSettings.rankMode,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, SETTINGS_ID))
    .limit(1);

  return {
    landingStandingsYears: row?.landingStandingsYears ?? null,
    rankMode: parseSharedRankMode(row?.rankMode),
  };
}

export async function getLandingStandingsYears(
  now: Date = new Date(),
  db: Db = getDb(),
): Promise<number[]> {
  const settings = await getSiteSettings(db);
  return resolveLandingStandingsYears(settings.landingStandingsYears, now);
}

export async function getSiteRankMode(
  db: Db = getDb(),
): Promise<SharedRankMode> {
  const settings = await getSiteSettings(db);
  return settings.rankMode;
}

/**
 * Persist homepage year override. Pass null to clear (use calendar default).
 */
export async function setLandingStandingsYears(
  years: number[] | null,
  db: Db = getDb(),
): Promise<SiteSettingsRow> {
  const normalized =
    years == null || years.length === 0
      ? null
      : resolveLandingStandingsYears(years);

  await db
    .insert(siteSettings)
    .values({
      id: SETTINGS_ID,
      landingStandingsYears: normalized,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        landingStandingsYears: normalized,
        updatedAt: new Date(),
      },
    });

  return getSiteSettings(db);
}

/**
 * Persist site live tie numbering (competition vs dense). Displayed ranks
 * are derived at read — changing this does not rescore lists.
 */
export async function setSiteRankMode(
  mode: SharedRankMode,
  db: Db = getDb(),
): Promise<SiteSettingsRow> {
  const rankMode = parseSharedRankMode(mode);

  await db
    .insert(siteSettings)
    .values({
      id: SETTINGS_ID,
      rankMode,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        rankMode,
        updatedAt: new Date(),
      },
    });

  return getSiteSettings(db);
}
