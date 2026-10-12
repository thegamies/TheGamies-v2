import { eq, sql } from "drizzle-orm";
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

/** Recount every mask for the year, then build the place index once. */
export async function rebuildPickemScores(year: number, db: Db = getDb()): Promise<void> {
  await db.execute(sql`drop index if exists tga_site_scores_board_idx`);
  await db.execute(sql`
    update tga_site_scores sc
    set
      points = ranked.points,
      wp_delta = ranked.wp_delta,
      place = ranked.place,
      updated_at = now()
    from (
      select
        scored.profile_id,
        scored.points,
        scored.wp_delta,
        rank() over (
          order by scored.points desc, scored.wp_delta asc nulls last
        ) as place
      from (
        select
          s.profile_id,
          coalesce((
            select count(*)::int
            from tga_winners w
            inner join tga_categories c on c.id = w.category_id
            inner join tga_category_nominees cn
              on cn.category_id = w.category_id
             and cn.nominee_id = w.nominee_id
            where c.year = s.year
              and s.ballot_mask is not null
              and get_byte(s.ballot_mask, c.slot) = cn.slot
          ), 0) as points,
          case
            when y.world_premieres_official is null or s.world_premieres_guess is null then null
            else abs(s.world_premieres_guess - y.world_premieres_official)
          end as wp_delta
        from tga_site_sheets s
        inner join tga_years y on y.year = s.year
        where s.year = ${year}
      ) scored
    ) ranked
    where sc.year = ${year}
      and sc.profile_id = ranked.profile_id
  `);
  await db.execute(sql`
    create index tga_site_scores_board_idx on tga_site_scores (year, place)
  `);

  await db.execute(sql`drop index if exists tga_community_scores_board_idx`);
  await db.execute(sql`
    update tga_community_scores sc
    set
      points = ranked.points,
      wp_delta = ranked.wp_delta,
      place = ranked.place,
      updated_at = now()
    from (
      select
        scored.community_id,
        scored.profile_id,
        scored.points,
        scored.wp_delta,
        rank() over (
          partition by scored.community_id
          order by scored.points desc, scored.wp_delta asc nulls last
        ) as place
      from (
        select
          s.community_id,
          s.profile_id,
          coalesce((
            select count(*)::int
            from tga_winners w
            inner join tga_categories c on c.id = w.category_id
            inner join tga_category_nominees cn
              on cn.category_id = w.category_id
             and cn.nominee_id = w.nominee_id
            where c.year = s.year
              and s.ballot_mask is not null
              and get_byte(s.ballot_mask, c.slot) = cn.slot
          ), 0) as points,
          case
            when y.world_premieres_official is null or s.world_premieres_guess is null then null
            else abs(s.world_premieres_guess - y.world_premieres_official)
          end as wp_delta
        from tga_community_sheets s
        inner join tga_years y on y.year = s.year
        where s.year = ${year}
      ) scored
    ) ranked
    where sc.year = ${year}
      and sc.community_id = ranked.community_id
      and sc.profile_id = ranked.profile_id
  `);
  await db.execute(sql`
    create index tga_community_scores_board_idx
    on tga_community_scores (community_id, year, place)
  `);
}

export async function upsertSiteScoreOnSave(
  profileId: string,
  year: number,
  guess: number,
  officialWp: number | null | undefined,
  db: Db = getDb(),
): Promise<void> {
  const wpDelta = worldPremieresDelta(guess, officialWp);
  const updatedAt = new Date();
  await db
    .insert(tgaSiteScores)
    .values({ year, profileId, points: 0, wpDelta, updatedAt })
    .onConflictDoUpdate({
      target: [tgaSiteScores.year, tgaSiteScores.profileId],
      set: { wpDelta, updatedAt },
    });
}

export async function upsertCommunityScoreOnSave(
  communityId: string,
  profileId: string,
  year: number,
  guess: number,
  officialWp: number | null | undefined,
  db: Db = getDb(),
): Promise<void> {
  const wpDelta = worldPremieresDelta(guess, officialWp);
  const updatedAt = new Date();
  await db
    .insert(tgaCommunityScores)
    .values({ communityId, year, profileId, points: 0, wpDelta, updatedAt })
    .onConflictDoUpdate({
      target: [
        tgaCommunityScores.communityId,
        tgaCommunityScores.year,
        tgaCommunityScores.profileId,
      ],
      set: { wpDelta, updatedAt },
    });
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

  await rebuildPickemScores(year, db);
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
  await rebuildPickemScores(year, db);
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
  if (!row || row.place == null) return null;
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
      sc.place,
      (
        select count(*)::int
        from tga_site_scores
        where year = sc.year and place is not null
      ) as field_size
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
      sc.place,
      (
        select count(*)::int
        from tga_community_scores
        where community_id = sc.community_id
          and year = sc.year
          and place is not null
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
  const coverage = await db.execute(sql`
    select
      count(*) filter (where place is not null)::int as placed,
      count(*)::int as total
    from tga_site_scores
    where year = ${year}
  `);
  const coverageRow = coverage.rows[0] as { placed?: number; total?: number } | undefined;
  const placed = Number(coverageRow?.placed ?? 0);
  const total = placed > 0 ? placed : Number(coverageRow?.total ?? 0);
  const totalPages = leaderboardPageCount(total);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * TGA_LEADERBOARD_PAGE_SIZE;
  const ranked =
    placed > 0
      ? await db.execute(sql`
          select
            sc.profile_id as profile_id,
            sc.points as points,
            sc.wp_delta as wp_delta,
            p.display_name as display_name,
            p.username as username,
            p.avatar_url as avatar_url,
            sc.place as place
          from tga_site_scores sc
          inner join profiles p on p.id = sc.profile_id
          where sc.year = ${year}
            and sc.place is not null
          order by sc.place asc, sc.profile_id asc
          limit ${TGA_LEADERBOARD_PAGE_SIZE}
          offset ${offset}
        `)
      : await db.execute(sql`
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
  let placed = 0;
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
    const coverage = await db.execute(sql`
      select
        count(*) filter (where place is not null)::int as placed,
        count(*)::int as total
      from tga_community_scores
      where community_id = ${communityId}
        and year = ${year}
    `);
    const coverageRow = coverage.rows[0] as
      | { placed?: number; total?: number }
      | undefined;
    placed = Number(coverageRow?.placed ?? 0);
    total = placed > 0 ? placed : Number(coverageRow?.total ?? 0);
  }
  const totalPages = leaderboardPageCount(total ?? 0);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * TGA_LEADERBOARD_PAGE_SIZE;
  const ranked = hostsOnly
    ? await db.execute(sql`
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
          inner join tga_community_hosts h
            on h.community_id = sc.community_id
           and h.year = sc.year
           and h.profile_id = sc.profile_id
          where sc.community_id = ${communityId}
            and sc.year = ${year}
        ) ranked
        order by points desc, wp_delta asc nulls last, profile_id asc
        limit ${TGA_LEADERBOARD_PAGE_SIZE}
        offset ${offset}
      `)
    : placed > 0
      ? await db.execute(sql`
          select
            sc.profile_id as profile_id,
            sc.points as points,
            sc.wp_delta as wp_delta,
            p.display_name as display_name,
            p.username as username,
            p.avatar_url as avatar_url,
            sc.place as place
          from tga_community_scores sc
          inner join profiles p on p.id = sc.profile_id
          where sc.community_id = ${communityId}
            and sc.year = ${year}
            and sc.place is not null
          order by sc.place asc, sc.profile_id asc
          limit ${TGA_LEADERBOARD_PAGE_SIZE}
          offset ${offset}
        `)
      : await db.execute(sql`
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
