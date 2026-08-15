import { eq } from "drizzle-orm";
import { createDb, siteSettings, type Db } from "@thegamies/db";
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
};

export async function getSiteSettings(
  db: Db = getDb(),
): Promise<SiteSettingsRow> {
  const [row] = await db
    .select({
      landingStandingsYears: siteSettings.landingStandingsYears,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, SETTINGS_ID))
    .limit(1);

  return {
    landingStandingsYears: row?.landingStandingsYears ?? null,
  };
}

export async function getLandingStandingsYears(
  now: Date = new Date(),
  db: Db = getDb(),
): Promise<number[]> {
  const settings = await getSiteSettings(db);
  return resolveLandingStandingsYears(settings.landingStandingsYears, now);
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

  return { landingStandingsYears: normalized };
}
