import { and, count, countDistinct, eq, sql } from "drizzle-orm";
import {
  liveCategoryDirty,
  liveCategoryScores,
  liveGotyContrib,
  liveGotyDirtyGames,
  liveGotyScores,
  liveGotyYearStats,
  type Db,
} from "@thegamies/db";
import { getLiveAggregateDb } from "./contrib";

const REFRESH_LOCK_STALE_MS = 60_000;

async function ensureYearStats(year: number, db: Db) {
  await db
    .insert(liveGotyYearStats)
    .values({ year })
    .onConflictDoNothing({ target: liveGotyYearStats.year });
}

async function tryAcquireRefreshLock(
  year: number,
  db: Db,
): Promise<boolean> {
  await ensureYearStats(year, db);
  const staleBefore = new Date(Date.now() - REFRESH_LOCK_STALE_MS);
  const updated = await db
    .update(liveGotyYearStats)
    .set({
      refreshing: true,
      refreshStartedAt: new Date(),
    })
    .where(
      and(
        eq(liveGotyYearStats.year, year),
        sql`(
          ${liveGotyYearStats.refreshing} = false
          OR ${liveGotyYearStats.refreshStartedAt} IS NULL
          OR ${liveGotyYearStats.refreshStartedAt} < ${staleBefore}
        )`,
      ),
    )
    .returning({ year: liveGotyYearStats.year });
  return updated.length > 0;
}

async function releaseRefreshLock(year: number, db: Db) {
  await db
    .update(liveGotyYearStats)
    .set({ refreshing: false, refreshStartedAt: null })
    .where(eq(liveGotyYearStats.year, year));
}

async function refreshListCount(year: number, db: Db) {
  const [row] = await db
    .select({
      listCount: countDistinct(liveGotyContrib.listId),
    })
    .from(liveGotyContrib)
    .where(eq(liveGotyContrib.year, year));
  await ensureYearStats(year, db);
  await db
    .update(liveGotyYearStats)
    .set({ listCount: Number(row?.listCount ?? 0) })
    .where(eq(liveGotyYearStats.year, year));
}

export const REFRESH_BATCH_SIZE = 500;
/** Bounds one refresh well inside REFRESH_LOCK_STALE_MS; leftovers wait for the next tick. */
const REFRESH_MAX_BATCHES = 20;

function claimedCount(result: unknown): number {
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown[] })?.rows ?? []);
  return Number((rows[0] as { claimed?: unknown } | undefined)?.claimed ?? 0);
}

/**
 * One statement per batch: claim (delete) dirty games first, so a save that
 * re-marks a game mid-refresh leaves a fresh mark for the next run; then
 * recompute absolute sums from contrib, upsert positives, drop zeros.
 */
async function refreshGotyBatch(year: number, batchSize: number, db: Db) {
  const result = await db.execute(sql`
    WITH claimed AS (
      DELETE FROM live_goty_dirty_games d
      WHERE d.year = ${year}
        AND d.game_id IN (
          SELECT game_id FROM live_goty_dirty_games
          WHERE year = ${year}
          ORDER BY game_id
          LIMIT ${batchSize}
        )
      RETURNING d.game_id
    ),
    agg AS (
      SELECT
        c.game_id,
        coalesce(sum(lc.points), 0)::int AS score,
        count(lc.game_id)::int AS list_mentions,
        count(*) FILTER (WHERE lc.rank = 1)::int AS r1,
        count(*) FILTER (WHERE lc.rank = 2)::int AS r2,
        count(*) FILTER (WHERE lc.rank = 3)::int AS r3,
        count(*) FILTER (WHERE lc.rank = 4)::int AS r4,
        count(*) FILTER (WHERE lc.rank = 5)::int AS r5,
        count(*) FILTER (WHERE lc.rank = 6)::int AS r6,
        count(*) FILTER (WHERE lc.rank = 7)::int AS r7,
        count(*) FILTER (WHERE lc.rank = 8)::int AS r8,
        count(*) FILTER (WHERE lc.rank = 9)::int AS r9,
        count(*) FILTER (WHERE lc.rank = 10)::int AS r10
      FROM claimed c
      LEFT JOIN live_goty_contrib lc
        ON lc.year = ${year} AND lc.game_id = c.game_id
      GROUP BY c.game_id
    ),
    upserted AS (
      INSERT INTO live_goty_scores (
        year, game_id, score, list_mentions,
        rank_1_count, rank_2_count, rank_3_count, rank_4_count, rank_5_count,
        rank_6_count, rank_7_count, rank_8_count, rank_9_count, rank_10_count
      )
      SELECT ${year}, game_id, score, list_mentions, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10
      FROM agg
      WHERE score > 0
      ON CONFLICT (year, game_id) DO UPDATE SET
        score = excluded.score,
        list_mentions = excluded.list_mentions,
        rank_1_count = excluded.rank_1_count,
        rank_2_count = excluded.rank_2_count,
        rank_3_count = excluded.rank_3_count,
        rank_4_count = excluded.rank_4_count,
        rank_5_count = excluded.rank_5_count,
        rank_6_count = excluded.rank_6_count,
        rank_7_count = excluded.rank_7_count,
        rank_8_count = excluded.rank_8_count,
        rank_9_count = excluded.rank_9_count,
        rank_10_count = excluded.rank_10_count
      RETURNING 1
    ),
    removed AS (
      DELETE FROM live_goty_scores s
      USING agg
      WHERE s.year = ${year} AND s.game_id = agg.game_id AND agg.score <= 0
      RETURNING 1
    )
    SELECT count(*)::int AS claimed FROM claimed
  `);
  return claimedCount(result);
}

async function refreshCategoryBatch(year: number, batchSize: number, db: Db) {
  const result = await db.execute(sql`
    WITH claimed AS (
      DELETE FROM live_category_dirty d
      WHERE d.year = ${year}
        AND (d.category_id, d.game_id) IN (
          SELECT category_id, game_id FROM live_category_dirty
          WHERE year = ${year}
          ORDER BY category_id, game_id
          LIMIT ${batchSize}
        )
      RETURNING d.category_id, d.game_id
    ),
    agg AS (
      SELECT c.category_id, c.game_id, count(lc.list_id)::int AS vote_count
      FROM claimed c
      LEFT JOIN live_category_contrib lc
        ON lc.year = ${year}
        AND lc.category_id = c.category_id
        AND lc.game_id = c.game_id
      GROUP BY c.category_id, c.game_id
    ),
    upserted AS (
      INSERT INTO live_category_scores (year, category_id, game_id, vote_count)
      SELECT ${year}, category_id, game_id, vote_count
      FROM agg
      WHERE vote_count > 0
      ON CONFLICT (year, category_id, game_id) DO UPDATE SET
        vote_count = excluded.vote_count
      RETURNING 1
    ),
    removed AS (
      DELETE FROM live_category_scores s
      USING agg
      WHERE s.year = ${year}
        AND s.category_id = agg.category_id
        AND s.game_id = agg.game_id
        AND agg.vote_count <= 0
      RETURNING 1
    )
    SELECT count(*)::int AS claimed FROM claimed
  `);
  return claimedCount(result);
}

async function processDirtyKeys(year: number, batchSize: number, db: Db) {
  for (let i = 0; i < REFRESH_MAX_BATCHES; i++) {
    if ((await refreshGotyBatch(year, batchSize, db)) < batchSize) break;
  }
  for (let i = 0; i < REFRESH_MAX_BATCHES; i++) {
    if ((await refreshCategoryBatch(year, batchSize, db)) < batchSize) break;
  }
}

async function remainingDirtyCount(year: number, db: Db): Promise<number> {
  const [g] = await db
    .select({ n: count() })
    .from(liveGotyDirtyGames)
    .where(eq(liveGotyDirtyGames.year, year));
  const [c] = await db
    .select({ n: count() })
    .from(liveCategoryDirty)
    .where(eq(liveCategoryDirty.year, year));
  return Number(g?.n ?? 0) + Number(c?.n ?? 0);
}

/**
 * Single-flight refresh for a year: absolute SUM dirty keys into score cache.
 * Bumps standingsVersion only when dirty is empty and generations can catch up.
 */
export async function tryRefreshYear(
  year: number,
  db: Db = getLiveAggregateDb(),
  opts: { batchSize?: number } = {},
): Promise<{ refreshed: boolean; reason?: string }> {
  const locked = await tryAcquireRefreshLock(year, db);
  if (!locked) return { refreshed: false, reason: "lock_held" };

  try {
    // Read before processing: dirty marks for every write up to this generation
    // already exist, so the scores below cover it. Later writes leave new marks.
    const [stats] = await db
      .select()
      .from(liveGotyYearStats)
      .where(eq(liveGotyYearStats.year, year))
      .limit(1);

    await processDirtyKeys(year, opts.batchSize ?? REFRESH_BATCH_SIZE, db);

    if ((await remainingDirtyCount(year, db)) > 0) {
      return { refreshed: true, reason: "partial_dirty_remaining" };
    }

    await refreshListCount(year, db);

    if (!stats || stats.contribGeneration <= stats.scoresGeneration) {
      return { refreshed: true, reason: "already_current" };
    }

    await db
      .update(liveGotyYearStats)
      .set({
        scoresGeneration: sql`greatest(${liveGotyYearStats.scoresGeneration}, ${stats.contribGeneration})`,
        standingsVersion: sql`${liveGotyYearStats.standingsVersion} + 1`,
      })
      .where(eq(liveGotyYearStats.year, year));

    return { refreshed: true };
  } finally {
    await releaseRefreshLock(year, db);
  }
}

/** Authoritative year rebuild: delete score cache, insert full GROUP BY from contrib. */
export async function rebuildYear(
  year: number,
  db: Db = getLiveAggregateDb(),
): Promise<void> {
  const locked = await tryAcquireRefreshLock(year, db);
  if (!locked) {
    throw new Error("Could not acquire refresh lock for that year.");
  }

  try {
    // One transaction: standings read the old scores until the new ones commit.
    await db.batch([
      db.delete(liveGotyScores).where(eq(liveGotyScores.year, year)),
      db.delete(liveCategoryScores).where(eq(liveCategoryScores.year, year)),
      db.delete(liveGotyDirtyGames).where(eq(liveGotyDirtyGames.year, year)),
      db.delete(liveCategoryDirty).where(eq(liveCategoryDirty.year, year)),
      db.execute(sql`
        INSERT INTO live_goty_scores (
          year, game_id, score, list_mentions,
          rank_1_count, rank_2_count, rank_3_count, rank_4_count, rank_5_count,
          rank_6_count, rank_7_count, rank_8_count, rank_9_count, rank_10_count
        )
        SELECT
          ${year}, game_id, coalesce(sum(points), 0)::int, count(*)::int,
          (count(*) FILTER (WHERE rank = 1))::int,
          (count(*) FILTER (WHERE rank = 2))::int,
          (count(*) FILTER (WHERE rank = 3))::int,
          (count(*) FILTER (WHERE rank = 4))::int,
          (count(*) FILTER (WHERE rank = 5))::int,
          (count(*) FILTER (WHERE rank = 6))::int,
          (count(*) FILTER (WHERE rank = 7))::int,
          (count(*) FILTER (WHERE rank = 8))::int,
          (count(*) FILTER (WHERE rank = 9))::int,
          (count(*) FILTER (WHERE rank = 10))::int
        FROM live_goty_contrib
        WHERE year = ${year}
        GROUP BY game_id`),
      db.execute(sql`
        INSERT INTO live_category_scores (year, category_id, game_id, vote_count)
        SELECT ${year}, category_id, game_id, count(*)::int
        FROM live_category_contrib
        WHERE year = ${year}
        GROUP BY category_id, game_id`),
    ]);

    await refreshListCount(year, db);

    const [stats] = await db
      .select()
      .from(liveGotyYearStats)
      .where(eq(liveGotyYearStats.year, year))
      .limit(1);

    await db
      .update(liveGotyYearStats)
      .set({
        scoresGeneration: stats?.contribGeneration ?? 0,
        standingsVersion: sql`${liveGotyYearStats.standingsVersion} + 1`,
      })
      .where(eq(liveGotyYearStats.year, year));
  } finally {
    await releaseRefreshLock(year, db);
  }
}

/** If scores lag contrib, try a locked refresh (lazy path for standings reads). */
export async function ensureScoresFresh(
  year: number,
  db: Db = getLiveAggregateDb(),
): Promise<void> {
  await ensureYearStats(year, db);
  const [stats] = await db
    .select()
    .from(liveGotyYearStats)
    .where(eq(liveGotyYearStats.year, year))
    .limit(1);
  if (!stats) return;
  if (stats.contribGeneration <= stats.scoresGeneration) return;
  await tryRefreshYear(year, db);
}

/** Fire-and-forget refresh after contrib writes (does not block the save response). */
export function scheduleYearRefresh(years: number[]) {
  const unique = [...new Set(years)].filter((y) => Number.isFinite(y));
  if (unique.length === 0) return;

  const run = async () => {
    for (const year of unique) {
      try {
        await tryRefreshYear(year);
      } catch {
        // Standings stay stale until next save/read/rebuild; contrib is truth.
      }
    }
  };

  try {
    // next/server `after` keeps work alive past the response when available.
    // Dynamic import keeps this module usable from unit tests without Next.
    void import("next/server")
      .then((mod) => {
        if (typeof mod.after === "function") {
          mod.after(run);
        } else {
          void run();
        }
      })
      .catch(() => {
        void run();
      });
  } catch {
    void run();
  }
}
