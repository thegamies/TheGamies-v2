import { and, asc, eq, sql } from "drizzle-orm";
import {
  createDb,
  profiles,
  tgaCommunityHosts,
  tgaCommunityPicks,
  tgaCommunitySheets,
  tgaSitePicks,
  tgaSiteSheets,
  type Db,
} from "@thegamies/db";
import {
  TGA_LEADERBOARD_PAGE_SIZE,
  leaderboardPageCount,
} from "./scoring";
import { getTgaYear, listTgaBallot } from "./service";
import { picksAreOpen } from "./status";

function getDb(db?: Db): Db {
  return db ?? createDb();
}

export type TgaSheetView = {
  worldPremieresGuess: number | null;
  picks: Record<string, string>;
};

export type TgaEntrantRow = {
  profileId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

export type TgaEntrantsPage = {
  rows: TgaEntrantRow[];
  page: number;
  totalPages: number;
  total: number;
};

function mapEntrantRow(row: {
  profileId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}): TgaEntrantRow {
  return {
    profileId: row.profileId,
    displayName: row.displayName,
    username: row.username,
    avatarUrl: row.avatarUrl,
  };
}

/** Names of people with a sheet. No picks. Paginated. */
export async function listSiteTgaEntrants(
  year: number,
  page: number,
  db: Db = getDb(),
): Promise<TgaEntrantsPage> {
  const [{ value: total }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(tgaSiteSheets)
    .where(eq(tgaSiteSheets.year, year));
  const totalCount = total ?? 0;
  const totalPages = leaderboardPageCount(totalCount);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * TGA_LEADERBOARD_PAGE_SIZE;
  const rows = await db
    .select({
      profileId: tgaSiteSheets.profileId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
    })
    .from(tgaSiteSheets)
    .innerJoin(profiles, eq(profiles.id, tgaSiteSheets.profileId))
    .where(eq(tgaSiteSheets.year, year))
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(TGA_LEADERBOARD_PAGE_SIZE)
    .offset(offset);
  return {
    rows: rows.map(mapEntrantRow),
    page: safePage,
    totalPages,
    total: totalCount,
  };
}

/** Names of people with a community sheet. No picks. Paginated. */
export async function listCommunityTgaEntrants(
  communityId: string,
  year: number,
  page: number,
  opts: { hostsOnly?: boolean } = {},
  db: Db = getDb(),
): Promise<TgaEntrantsPage> {
  const hostsOnly = Boolean(opts.hostsOnly);
  const scope = and(
    eq(tgaCommunitySheets.communityId, communityId),
    eq(tgaCommunitySheets.year, year),
  );
  const fromSheets = () => {
    const query = db
      .select({
        profileId: tgaCommunitySheets.profileId,
        displayName: profiles.displayName,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
      })
      .from(tgaCommunitySheets)
      .innerJoin(profiles, eq(profiles.id, tgaCommunitySheets.profileId));
    if (!hostsOnly) return query.where(scope);
    return query
      .innerJoin(
        tgaCommunityHosts,
        and(
          eq(tgaCommunityHosts.communityId, tgaCommunitySheets.communityId),
          eq(tgaCommunityHosts.year, tgaCommunitySheets.year),
          eq(tgaCommunityHosts.profileId, tgaCommunitySheets.profileId),
        ),
      )
      .where(scope);
  };

  let totalCount = 0;
  if (hostsOnly) {
    const counted = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(tgaCommunitySheets)
      .innerJoin(
        tgaCommunityHosts,
        and(
          eq(tgaCommunityHosts.communityId, tgaCommunitySheets.communityId),
          eq(tgaCommunityHosts.year, tgaCommunitySheets.year),
          eq(tgaCommunityHosts.profileId, tgaCommunitySheets.profileId),
        ),
      )
      .where(scope);
    totalCount = counted[0]?.value ?? 0;
  } else {
    const [row] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(tgaCommunitySheets)
      .where(scope);
    totalCount = row?.value ?? 0;
  }

  const totalPages = leaderboardPageCount(totalCount);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * TGA_LEADERBOARD_PAGE_SIZE;
  const rows = await fromSheets()
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(TGA_LEADERBOARD_PAGE_SIZE)
    .offset(offset);
  return {
    rows: rows.map(mapEntrantRow),
    page: safePage,
    totalPages,
    total: totalCount,
  };
}

export async function getSiteSheet(
  profileId: string,
  year: number,
  db: Db = getDb(),
): Promise<TgaSheetView> {
  const [sheet] = await db
    .select()
    .from(tgaSiteSheets)
    .where(
      and(eq(tgaSiteSheets.profileId, profileId), eq(tgaSiteSheets.year, year)),
    );
  const picks = await db
    .select()
    .from(tgaSitePicks)
    .where(
      and(eq(tgaSitePicks.profileId, profileId), eq(tgaSitePicks.year, year)),
    );
  return {
    worldPremieresGuess: sheet?.worldPremieresGuess ?? null,
    picks: Object.fromEntries(picks.map((row) => [row.categoryId, row.nomineeId])),
  };
}

export async function getCommunitySheet(
  communityId: string,
  profileId: string,
  year: number,
  db: Db = getDb(),
): Promise<TgaSheetView> {
  const [sheet] = await db
    .select()
    .from(tgaCommunitySheets)
    .where(
      and(
        eq(tgaCommunitySheets.communityId, communityId),
        eq(tgaCommunitySheets.profileId, profileId),
        eq(tgaCommunitySheets.year, year),
      ),
    );
  const picks = await db
    .select()
    .from(tgaCommunityPicks)
    .where(
      and(
        eq(tgaCommunityPicks.communityId, communityId),
        eq(tgaCommunityPicks.profileId, profileId),
        eq(tgaCommunityPicks.year, year),
      ),
    );
  return {
    worldPremieresGuess: sheet?.worldPremieresGuess ?? null,
    picks: Object.fromEntries(picks.map((row) => [row.categoryId, row.nomineeId])),
  };
}

function assertOpen(yearRow: Awaited<ReturnType<typeof getTgaYear>>) {
  if (!yearRow) return { error: "Year not found." } as const;
  if (!picksAreOpen(yearRow)) {
    return { error: "Picks are not open." } as const;
  }
  return null;
}

function parseGuess(raw: unknown): number | { error: string } {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 200) {
    return { error: "Enter a World Premieres guess from 0 to 200." };
  }
  return n;
}

async function allowedPicks(
  year: number,
  picks: Record<string, string>,
  db: Db,
): Promise<Array<{ categoryId: string; nomineeId: string }> | { error: string }> {
  const ballot = await listTgaBallot(year, db);
  const allowed = new Map(
    ballot.map((category) => [
      category.id,
      new Set(category.nominees.map((nominee) => nominee.id)),
    ]),
  );
  const rows: Array<{ categoryId: string; nomineeId: string }> = [];
  for (const [categoryId, nomineeId] of Object.entries(picks)) {
    const set = allowed.get(categoryId);
    if (!set || !set.has(nomineeId)) {
      return { error: "Choose a nominee from the official slate." };
    }
    rows.push({ categoryId, nomineeId });
  }
  return rows;
}

export async function saveSiteSheet(
  profileId: string,
  year: number,
  input: { worldPremieresGuess: number; picks: Record<string, string> },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const blocked = assertOpen(await getTgaYear(year, db));
  if (blocked) return blocked;
  const guess = parseGuess(input.worldPremieresGuess);
  if (typeof guess !== "number") return guess;
  const rows = await allowedPicks(year, input.picks, db);
  if ("error" in rows) return rows;

  await db
    .insert(tgaSiteSheets)
    .values({
      profileId,
      year,
      worldPremieresGuess: guess,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [tgaSiteSheets.profileId, tgaSiteSheets.year],
      set: {
        worldPremieresGuess: guess,
        updatedAt: new Date(),
      },
    });
  await db
    .delete(tgaSitePicks)
    .where(
      and(eq(tgaSitePicks.profileId, profileId), eq(tgaSitePicks.year, year)),
    );
  if (rows.length > 0) {
    await db.insert(tgaSitePicks).values(
      rows.map((row) => ({
        profileId,
        year,
        categoryId: row.categoryId,
        nomineeId: row.nomineeId,
      })),
    );
  }
  return { ok: true };
}

export async function saveCommunitySheet(
  communityId: string,
  profileId: string,
  year: number,
  input: { worldPremieresGuess: number; picks: Record<string, string> },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const blocked = assertOpen(await getTgaYear(year, db));
  if (blocked) return blocked;
  const guess = parseGuess(input.worldPremieresGuess);
  if (typeof guess !== "number") return guess;
  const rows = await allowedPicks(year, input.picks, db);
  if ("error" in rows) return rows;

  await db
    .insert(tgaCommunitySheets)
    .values({
      communityId,
      profileId,
      year,
      worldPremieresGuess: guess,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        tgaCommunitySheets.communityId,
        tgaCommunitySheets.profileId,
        tgaCommunitySheets.year,
      ],
      set: {
        worldPremieresGuess: guess,
        updatedAt: new Date(),
      },
    });
  await db
    .delete(tgaCommunityPicks)
    .where(
      and(
        eq(tgaCommunityPicks.communityId, communityId),
        eq(tgaCommunityPicks.profileId, profileId),
        eq(tgaCommunityPicks.year, year),
      ),
    );
  if (rows.length > 0) {
    await db.insert(tgaCommunityPicks).values(
      rows.map((row) => ({
        communityId,
        profileId,
        year,
        categoryId: row.categoryId,
        nomineeId: row.nomineeId,
      })),
    );
  }
  return { ok: true };
}

export async function importSiteSheetToCommunity(
  communityId: string,
  profileId: string,
  year: number,
  db: Db = getDb(),
): Promise<
  | { ok: true; picks: Record<string, string>; worldPremieresGuess: number }
  | { error: string }
> {
  const site = await getSiteSheet(profileId, year, db);
  if (site.worldPremieresGuess == null && Object.keys(site.picks).length === 0) {
    return { error: "You do not have a global pick sheet yet." };
  }
  const worldPremieresGuess = site.worldPremieresGuess ?? 0;
  const result = await saveCommunitySheet(
    communityId,
    profileId,
    year,
    {
      worldPremieresGuess,
      picks: site.picks,
    },
    db,
  );
  if ("error" in result) return result;
  return { ok: true, picks: site.picks, worldPremieresGuess };
}
