import { and, eq, sql } from "drizzle-orm";
import {
  createDb,
  tgaCommunityScores,
  tgaSiteScores,
  tgaWinners,
  tgaYears,
  type Db,
} from "@thegamies/db";
import {
  TGA_LEADERBOARD_PAGE_SIZE,
  leaderboardPageCount,
  worldPremieresDelta,
} from "./scoring";

function getDb(db?: Db): Db {
  return db ?? createDb();
}

async function ensureSiteScoreRows(year: number, officialWp: number | null, db: Db) {
  await db.execute(sql`
    insert into tga_site_scores (year, profile_id, points, wp_delta, updated_at)
    select
      ${year},
      s.profile_id,
      0,
      case
        when ${officialWp}::int is null or s.world_premieres_guess is null then null
        else abs(s.world_premieres_guess - ${officialWp}::int)
      end,
      now()
    from tga_site_sheets s
    where s.year = ${year}
    on conflict (year, profile_id) do nothing
  `);
}

async function ensureCommunityScoreRows(
  year: number,
  officialWp: number | null,
  db: Db,
) {
  await db.execute(sql`
    insert into tga_community_scores (community_id, year, profile_id, points, wp_delta, updated_at)
    select
      s.community_id,
      ${year},
      s.profile_id,
      0,
      case
        when ${officialWp}::int is null or s.world_premieres_guess is null then null
        else abs(s.world_premieres_guess - ${officialWp}::int)
      end,
      now()
    from tga_community_sheets s
    where s.year = ${year}
    on conflict (community_id, year, profile_id) do nothing
  `);
}

async function applyWinnerDelta(
  year: number,
  categoryId: string,
  oldNomineeId: string | null,
  newNomineeId: string | null,
  db: Db,
) {
  if (oldNomineeId && oldNomineeId !== newNomineeId) {
    await db.execute(sql`
      update tga_site_scores sc
      set points = greatest(points - 1, 0), updated_at = now()
      from tga_site_picks p
      where sc.year = ${year}
        and p.year = ${year}
        and p.profile_id = sc.profile_id
        and p.category_id = ${categoryId}
        and p.nominee_id = ${oldNomineeId}
    `);
    await db.execute(sql`
      update tga_community_scores sc
      set points = greatest(points - 1, 0), updated_at = now()
      from tga_community_picks p
      where sc.year = ${year}
        and p.year = ${year}
        and p.community_id = sc.community_id
        and p.profile_id = sc.profile_id
        and p.category_id = ${categoryId}
        and p.nominee_id = ${oldNomineeId}
    `);
  }
  if (newNomineeId && newNomineeId !== oldNomineeId) {
    await db.execute(sql`
      update tga_site_scores sc
      set points = points + 1, updated_at = now()
      from tga_site_picks p
      where sc.year = ${year}
        and p.year = ${year}
        and p.profile_id = sc.profile_id
        and p.category_id = ${categoryId}
        and p.nominee_id = ${newNomineeId}
    `);
    await db.execute(sql`
      update tga_community_scores sc
      set points = points + 1, updated_at = now()
      from tga_community_picks p
      where sc.year = ${year}
        and p.year = ${year}
        and p.community_id = sc.community_id
        and p.profile_id = sc.profile_id
        and p.category_id = ${categoryId}
        and p.nominee_id = ${newNomineeId}
    `);
  }
}

export async function callTgaWinner(
  year: number,
  categoryId: string,
  nomineeId: string | null,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const [slate] = await db.select().from(tgaYears).where(eq(tgaYears.year, year));
  if (!slate) return { error: "Year not found." };

  const [existing] = await db
    .select()
    .from(tgaWinners)
    .where(eq(tgaWinners.categoryId, categoryId));

  await ensureSiteScoreRows(year, slate.worldPremieresOfficial, db);
  await ensureCommunityScoreRows(year, slate.worldPremieresOfficial, db);

  if (nomineeId) {
    await db
      .insert(tgaWinners)
      .values({
        categoryId,
        nomineeId,
        calledAt: new Date(),
      })
      .onConflictDoUpdate({
        target: tgaWinners.categoryId,
        set: { nomineeId, calledAt: new Date() },
      });
  } else if (existing) {
    await db.delete(tgaWinners).where(eq(tgaWinners.categoryId, categoryId));
  }

  await applyWinnerDelta(
    year,
    categoryId,
    existing?.nomineeId ?? null,
    nomineeId,
    db,
  );
  return { ok: true };
}

export async function setOfficialWorldPremieres(
  year: number,
  count: number | null,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  if (count != null && (!Number.isInteger(count) || count < 0 || count > 200)) {
    return { error: "Enter a World Premieres count from 0 to 200." };
  }
  await db
    .update(tgaYears)
    .set({ worldPremieresOfficial: count, updatedAt: new Date() })
    .where(eq(tgaYears.year, year));

  if (count == null) {
    await db
      .update(tgaSiteScores)
      .set({ wpDelta: null, updatedAt: new Date() })
      .where(eq(tgaSiteScores.year, year));
    await db
      .update(tgaCommunityScores)
      .set({ wpDelta: null, updatedAt: new Date() })
      .where(eq(tgaCommunityScores.year, year));
    return { ok: true };
  }

  await db.execute(sql`
    update tga_site_scores sc
    set wp_delta = abs(s.world_premieres_guess - ${count}), updated_at = now()
    from tga_site_sheets s
    where sc.year = ${year}
      and s.year = ${year}
      and s.profile_id = sc.profile_id
      and s.world_premieres_guess is not null
  `);
  await db.execute(sql`
    update tga_community_scores sc
    set wp_delta = abs(s.world_premieres_guess - ${count}), updated_at = now()
    from tga_community_sheets s
    where sc.year = ${year}
      and s.year = ${year}
      and s.community_id = sc.community_id
      and s.profile_id = sc.profile_id
      and s.world_premieres_guess is not null
  `);
  return { ok: true };
}

export type TgaLeaderboardRow = {
  place: number;
  profileId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  points: number;
  wpDelta: number | null;
};

export type TgaViewerStanding = {
  place: number;
  points: number;
  wpDelta: number | null;
  fieldSize: number;
};

function mapLeaderboardRow(row: Record<string, unknown>): TgaLeaderboardRow {
  return {
    place: Number(row.place),
    profileId: String(row.profile_id),
    displayName: String(row.display_name),
    username: String(row.username),
    avatarUrl: row.avatar_url == null ? null : String(row.avatar_url),
    points: Number(row.points),
    wpDelta: row.wp_delta == null ? null : Number(row.wp_delta),
  };
}

function standingFromRow(
  row: Record<string, unknown> | undefined,
): TgaViewerStanding | null {
  if (!row) return null;
  return {
    points: Number(row.points),
    wpDelta: row.wp_delta == null ? null : Number(row.wp_delta),
    place: Number(row.place),
    fieldSize: Number(row.field_size),
  };
}

/** One profile's place from score rows — no leaderboard dump. */
export async function getSiteViewerStanding(
  year: number,
  profileId: string,
  db: Db = getDb(),
): Promise<TgaViewerStanding | null> {
  const result = await db.execute(sql`
    select
      sc.points,
      sc.wp_delta,
      (
        select count(*)::int
        from tga_site_scores other
        where other.year = sc.year
          and (
            other.points > sc.points
            or (
              other.points = sc.points
              and other.wp_delta is not null
              and sc.wp_delta is not null
              and other.wp_delta < sc.wp_delta
            )
            or (
              other.points = sc.points
              and other.wp_delta is not null
              and sc.wp_delta is null
            )
          )
      ) + 1 as place,
      (select count(*)::int from tga_site_scores where year = sc.year) as field_size
    from tga_site_scores sc
    where sc.year = ${year} and sc.profile_id = ${profileId}
  `);
  return standingFromRow(result.rows[0] as Record<string, unknown> | undefined);
}

export async function getCommunityViewerStanding(
  communityId: string,
  year: number,
  profileId: string,
  db: Db = getDb(),
): Promise<TgaViewerStanding | null> {
  const result = await db.execute(sql`
    select
      sc.points,
      sc.wp_delta,
      (
        select count(*)::int
        from tga_community_scores other
        where other.community_id = sc.community_id
          and other.year = sc.year
          and (
            other.points > sc.points
            or (
              other.points = sc.points
              and other.wp_delta is not null
              and sc.wp_delta is not null
              and other.wp_delta < sc.wp_delta
            )
            or (
              other.points = sc.points
              and other.wp_delta is not null
              and sc.wp_delta is null
            )
          )
      ) + 1 as place,
      (
        select count(*)::int
        from tga_community_scores
        where community_id = sc.community_id and year = sc.year
      ) as field_size
    from tga_community_scores sc
    where sc.community_id = ${communityId}
      and sc.year = ${year}
      and sc.profile_id = ${profileId}
  `);
  return standingFromRow(result.rows[0] as Record<string, unknown> | undefined);
}

export async function listSiteLeaderboard(
  year: number,
  page: number,
  db: Db = getDb(),
): Promise<{ rows: TgaLeaderboardRow[]; page: number; totalPages: number; total: number }> {
  const [{ value: total }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(tgaSiteScores)
    .where(eq(tgaSiteScores.year, year));
  const totalPages = leaderboardPageCount(total ?? 0);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * TGA_LEADERBOARD_PAGE_SIZE;
  const ranked = await db.execute(sql`
    select *
    from (
      select
        sc.profile_id as profile_id,
        sc.points as points,
        sc.wp_delta as wp_delta,
        p.display_name as display_name,
        p.username as username,
        p.avatar_url as avatar_url,
        rank() over (
          order by sc.points desc, sc.wp_delta asc nulls last
        ) as place
      from tga_site_scores sc
      inner join profiles p on p.id = sc.profile_id
      where sc.year = ${year}
    ) ranked
    order by points desc, wp_delta asc nulls last, profile_id asc
    limit ${TGA_LEADERBOARD_PAGE_SIZE}
    offset ${offset}
  `);

  return {
    rows: ranked.rows.map((row) => mapLeaderboardRow(row as Record<string, unknown>)),
    page: safePage,
    totalPages,
    total: total ?? 0,
  };
}

export async function listCommunityLeaderboard(
  communityId: string,
  year: number,
  page: number,
  opts: { hostsOnly?: boolean } = {},
  db: Db = getDb(),
): Promise<{ rows: TgaLeaderboardRow[]; page: number; totalPages: number; total: number }> {
  const hostsOnly = Boolean(opts.hostsOnly);
  let total = 0;
  if (hostsOnly) {
    const counted = await db.execute(sql`
      select count(*)::int as value
      from tga_community_scores sc
      inner join tga_community_hosts h
        on h.community_id = sc.community_id
       and h.year = sc.year
       and h.profile_id = sc.profile_id
      where sc.community_id = ${communityId}
        and sc.year = ${year}
    `);
    total = Number(
      (counted.rows[0] as { value?: number } | undefined)?.value ?? 0,
    );
  } else {
    const [row] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(tgaCommunityScores)
      .where(
        and(
          eq(tgaCommunityScores.communityId, communityId),
          eq(tgaCommunityScores.year, year),
        ),
      );
    total = row?.value ?? 0;
  }
  const totalPages = leaderboardPageCount(total ?? 0);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * TGA_LEADERBOARD_PAGE_SIZE;
  const hostJoin = hostsOnly
    ? sql`
        inner join tga_community_hosts h
          on h.community_id = sc.community_id
         and h.year = sc.year
         and h.profile_id = sc.profile_id
      `
    : sql``;
  const ranked = await db.execute(sql`
    select *
    from (
      select
        sc.profile_id as profile_id,
        sc.points as points,
        sc.wp_delta as wp_delta,
        p.display_name as display_name,
        p.username as username,
        p.avatar_url as avatar_url,
        rank() over (
          order by sc.points desc, sc.wp_delta asc nulls last
        ) as place
      from tga_community_scores sc
      inner join profiles p on p.id = sc.profile_id
      ${hostJoin}
      where sc.community_id = ${communityId}
        and sc.year = ${year}
    ) ranked
    order by points desc, wp_delta asc nulls last, profile_id asc
    limit ${TGA_LEADERBOARD_PAGE_SIZE}
    offset ${offset}
  `);

  return {
    rows: ranked.rows.map((row) => mapLeaderboardRow(row as Record<string, unknown>)),
    page: safePage,
    totalPages,
    total: total ?? 0,
  };
}

export { worldPremieresDelta };
