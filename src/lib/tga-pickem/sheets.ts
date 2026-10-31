import { and, asc, eq, sql } from "drizzle-orm";
import {
  createDb,
  profiles,
  tgaCommunityHosts,
  tgaCommunityPickCounts,
  tgaCommunitySheets,
  tgaSitePickCounts,
  tgaSiteSheets,
  type Db,
} from "@thegamies/db";
import {
  decodeBallotMask,
  encodeBallotMask,
  pickCountDeltas,
  type PickCountDelta,
} from "./ballot-mask";
import {
  TGA_LEADERBOARD_PAGE_SIZE,
  leaderboardPageCount,
} from "./scoring";
import {
  getTgaYear,
  isCommunityTgaOptedIn,
  listTgaBallot,
  type TgaBallotCategory,
} from "./service";
import { upsertCommunityScoreOnSave, upsertSiteScoreOnSave } from "./scores";
import { picksAreOpen } from "./status";

export const COMMUNITY_TGA_NOT_RUNNING =
  "This community isn’t running Pick’em for that year.";

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

export function siteSheetHasContent(sheet: TgaSheetView): boolean {
  return (
    sheet.worldPremieresGuess != null || Object.keys(sheet.picks).length > 0
  );
}

/** True when the person already has a saved global Pick’em sheet for that year. */
export async function hasImportableSiteTgaSheet(
  profileId: string,
  year: number,
  db: Db = getDb(),
): Promise<boolean> {
  const [sheet] = await db
    .select({
      worldPremieresGuess: tgaSiteSheets.worldPremieresGuess,
      ballotMask: tgaSiteSheets.ballotMask,
    })
    .from(tgaSiteSheets)
    .where(
      and(eq(tgaSiteSheets.profileId, profileId), eq(tgaSiteSheets.year, year)),
    )
    .limit(1);
  if (!sheet) return false;
  if (sheet.worldPremieresGuess != null) return true;
  const mask = sheet.ballotMask;
  if (!mask) return false;
  for (const byte of mask) {
    if (byte !== 0) return true;
  }
  return false;
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
  const ballot = await listTgaBallot(year, db);
  return {
    worldPremieresGuess: sheet?.worldPremieresGuess ?? null,
    picks: decodeBallotMask(sheet?.ballotMask, ballot),
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
  const ballot = await listTgaBallot(year, db);
  return {
    worldPremieresGuess: sheet?.worldPremieresGuess ?? null,
    picks: decodeBallotMask(sheet?.ballotMask, ballot),
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

async function validatedBallot(
  year: number,
  picks: Record<string, string>,
  db: Db,
): Promise<{ ballot: TgaBallotCategory[] } | { error: string }> {
  const ballot = await listTgaBallot(year, db);
  const allowed = new Map(
    ballot.map((category) => [
      category.id,
      new Set(category.nominees.map((nominee) => nominee.id)),
    ]),
  );
  for (const [categoryId, nomineeId] of Object.entries(picks)) {
    const set = allowed.get(categoryId);
    if (!set || !set.has(nomineeId)) {
      return { error: "Choose a nominee from the official slate." };
    }
  }
  return { ballot };
}

export async function applySitePickCountDeltas(
  year: number,
  deltas: PickCountDelta[],
  db: Db,
): Promise<void> {
  for (const delta of deltas) {
    await db
      .insert(tgaSitePickCounts)
      .values({
        year,
        categoryId: delta.categoryId,
        nomineeId: delta.nomineeId,
        picks: Math.max(delta.delta, 0),
      })
      .onConflictDoUpdate({
        target: [
          tgaSitePickCounts.year,
          tgaSitePickCounts.categoryId,
          tgaSitePickCounts.nomineeId,
        ],
        set: {
          picks: sql`greatest(${tgaSitePickCounts.picks} + ${delta.delta}, 0)`,
        },
      });
  }
}

export async function applyCommunityPickCountDeltas(
  communityId: string,
  year: number,
  deltas: PickCountDelta[],
  db: Db,
): Promise<void> {
  for (const delta of deltas) {
    await db
      .insert(tgaCommunityPickCounts)
      .values({
        communityId,
        year,
        categoryId: delta.categoryId,
        nomineeId: delta.nomineeId,
        picks: Math.max(delta.delta, 0),
      })
      .onConflictDoUpdate({
        target: [
          tgaCommunityPickCounts.communityId,
          tgaCommunityPickCounts.year,
          tgaCommunityPickCounts.categoryId,
          tgaCommunityPickCounts.nomineeId,
        ],
        set: {
          picks: sql`greatest(${tgaCommunityPickCounts.picks} + ${delta.delta}, 0)`,
        },
      });
  }
}

export async function recountSitePickCounts(year: number, db: Db): Promise<void> {
  await db.execute(sql`delete from tga_site_pick_counts where year = ${year}`);
  await db.execute(sql`
    insert into tga_site_pick_counts (year, category_id, nominee_id, picks)
    select s.year, c.id, cn.nominee_id, count(*)::int
    from tga_site_sheets s
    inner join tga_categories c on c.year = s.year
    inner join tga_category_nominees cn on cn.category_id = c.id
    where s.year = ${year}
      and s.ballot_mask is not null
      and get_byte(s.ballot_mask, c.slot) = cn.slot
    group by s.year, c.id, cn.nominee_id
  `);
}

export async function recountCommunityPickCounts(
  year: number,
  db: Db,
  communityId?: string,
): Promise<void> {
  if (communityId) {
    await db.execute(sql`
      delete from tga_community_pick_counts
      where year = ${year} and community_id = ${communityId}
    `);
  } else {
    await db.execute(sql`delete from tga_community_pick_counts where year = ${year}`);
  }
  await db.execute(sql`
    insert into tga_community_pick_counts (
      community_id, year, category_id, nominee_id, picks
    )
    select s.community_id, s.year, c.id, cn.nominee_id, count(*)::int
    from tga_community_sheets s
    inner join tga_categories c on c.year = s.year
    inner join tga_category_nominees cn on cn.category_id = c.id
    where s.year = ${year}
      and (${communityId ?? null}::uuid is null or s.community_id = ${communityId ?? null}::uuid)
      and s.ballot_mask is not null
      and get_byte(s.ballot_mask, c.slot) = cn.slot
    group by s.community_id, s.year, c.id, cn.nominee_id
  `);
}

export async function saveSiteSheet(
  profileId: string,
  year: number,
  input: { worldPremieresGuess: number; picks: Record<string, string> },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const slate = await getTgaYear(year, db);
  const blocked = assertOpen(slate);
  if (blocked || !slate) return blocked ?? { error: "Year not found." };
  const guess = parseGuess(input.worldPremieresGuess);
  if (typeof guess !== "number") return guess;
  const slatePicks = await validatedBallot(year, input.picks, db);
  if ("error" in slatePicks) return slatePicks;
  const [current] = await db
    .select({ ballotMask: tgaSiteSheets.ballotMask })
    .from(tgaSiteSheets)
    .where(
      and(eq(tgaSiteSheets.profileId, profileId), eq(tgaSiteSheets.year, year)),
    );
  const previous = decodeBallotMask(current?.ballotMask, slatePicks.ballot);
  const ballotMask = encodeBallotMask(slatePicks.ballot, input.picks);

  await db
    .insert(tgaSiteSheets)
    .values({
      profileId,
      year,
      worldPremieresGuess: guess,
      ballotMask,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [tgaSiteSheets.profileId, tgaSiteSheets.year],
      set: {
        worldPremieresGuess: guess,
        ballotMask,
        updatedAt: new Date(),
      },
    });
  await applySitePickCountDeltas(
    year,
    pickCountDeltas(previous, input.picks),
    db,
  );
  await upsertSiteScoreOnSave(
    profileId,
    year,
    guess,
    slate.worldPremieresOfficial,
    db,
  );
  return { ok: true };
}

export async function saveCommunitySheet(
  communityId: string,
  profileId: string,
  year: number,
  input: { worldPremieresGuess: number; picks: Record<string, string> },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const slate = await getTgaYear(year, db);
  const blocked = assertOpen(slate);
  if (blocked || !slate) return blocked ?? { error: "Year not found." };
  if (!(await isCommunityTgaOptedIn(communityId, year, db))) {
    return { error: COMMUNITY_TGA_NOT_RUNNING };
  }
  const guess = parseGuess(input.worldPremieresGuess);
  if (typeof guess !== "number") return guess;
  const slatePicks = await validatedBallot(year, input.picks, db);
  if ("error" in slatePicks) return slatePicks;
  const [current] = await db
    .select({ ballotMask: tgaCommunitySheets.ballotMask })
    .from(tgaCommunitySheets)
    .where(
      and(
        eq(tgaCommunitySheets.communityId, communityId),
        eq(tgaCommunitySheets.profileId, profileId),
        eq(tgaCommunitySheets.year, year),
      ),
    );
  const previous = decodeBallotMask(current?.ballotMask, slatePicks.ballot);
  const ballotMask = encodeBallotMask(slatePicks.ballot, input.picks);

  await db
    .insert(tgaCommunitySheets)
    .values({
      communityId,
      profileId,
      year,
      worldPremieresGuess: guess,
      ballotMask,
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
        ballotMask,
        updatedAt: new Date(),
      },
    });
  await applyCommunityPickCountDeltas(
    communityId,
    year,
    pickCountDeltas(previous, input.picks),
    db,
  );
  await upsertCommunityScoreOnSave(
    communityId,
    profileId,
    year,
    guess,
    slate.worldPremieresOfficial,
    db,
  );
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
  if (!siteSheetHasContent(site)) {
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
