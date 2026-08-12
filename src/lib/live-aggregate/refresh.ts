import { and, count, countDistinct, eq, sql } from "drizzle-orm";
import {
  liveCategoryContrib,
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

async function upsertGotyScoreFromContrib(
  year: number,
  gameId: string,
  db: Db,
) {
  const [agg] = await db
    .select({
      score: sql<number>`coalesce(sum(${liveGotyContrib.points}), 0)::int`,
      listMentions: count(),
      rank1Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 1 then 1 else 0 end), 0)::int`,
      rank2Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 2 then 1 else 0 end), 0)::int`,
      rank3Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 3 then 1 else 0 end), 0)::int`,
      rank4Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 4 then 1 else 0 end), 0)::int`,
      rank5Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 5 then 1 else 0 end), 0)::int`,
      rank6Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 6 then 1 else 0 end), 0)::int`,
      rank7Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 7 then 1 else 0 end), 0)::int`,
      rank8Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 8 then 1 else 0 end), 0)::int`,
      rank9Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 9 then 1 else 0 end), 0)::int`,
      rank10Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 10 then 1 else 0 end), 0)::int`,
    })
    .from(liveGotyContrib)
    .where(
      and(eq(liveGotyContrib.year, year), eq(liveGotyContrib.gameId, gameId)),
    );

  const score = Number(agg?.score ?? 0);
  if (score <= 0) {
    await db
      .delete(liveGotyScores)
      .where(
        and(eq(liveGotyScores.year, year), eq(liveGotyScores.gameId, gameId)),
      );
    return;
  }

  const values = {
    year,
    gameId,
    score,
    listMentions: Number(agg?.listMentions ?? 0),
    rank1Count: Number(agg?.rank1Count ?? 0),
    rank2Count: Number(agg?.rank2Count ?? 0),
    rank3Count: Number(agg?.rank3Count ?? 0),
    rank4Count: Number(agg?.rank4Count ?? 0),
    rank5Count: Number(agg?.rank5Count ?? 0),
    rank6Count: Number(agg?.rank6Count ?? 0),
    rank7Count: Number(agg?.rank7Count ?? 0),
    rank8Count: Number(agg?.rank8Count ?? 0),
    rank9Count: Number(agg?.rank9Count ?? 0),
    rank10Count: Number(agg?.rank10Count ?? 0),
  };

  await db
    .insert(liveGotyScores)
    .values(values)
    .onConflictDoUpdate({
      target: [liveGotyScores.year, liveGotyScores.gameId],
      set: {
        score: values.score,
        listMentions: values.listMentions,
        rank1Count: values.rank1Count,
        rank2Count: values.rank2Count,
        rank3Count: values.rank3Count,
        rank4Count: values.rank4Count,
        rank5Count: values.rank5Count,
        rank6Count: values.rank6Count,
        rank7Count: values.rank7Count,
        rank8Count: values.rank8Count,
        rank9Count: values.rank9Count,
        rank10Count: values.rank10Count,
      },
    });
}

async function upsertCategoryScoreFromContrib(
  year: number,
  categoryId: string,
  gameId: string,
  db: Db,
) {
  const [agg] = await db
    .select({ voteCount: count() })
    .from(liveCategoryContrib)
    .where(
      and(
        eq(liveCategoryContrib.year, year),
        eq(liveCategoryContrib.categoryId, categoryId),
        eq(liveCategoryContrib.gameId, gameId),
      ),
    );

  const voteCount = Number(agg?.voteCount ?? 0);
  if (voteCount <= 0) {
    await db
      .delete(liveCategoryScores)
      .where(
        and(
          eq(liveCategoryScores.year, year),
          eq(liveCategoryScores.categoryId, categoryId),
          eq(liveCategoryScores.gameId, gameId),
        ),
      );
    return;
  }

  await db
    .insert(liveCategoryScores)
    .values({ year, categoryId, gameId, voteCount })
    .onConflictDoUpdate({
      target: [
        liveCategoryScores.year,
        liveCategoryScores.categoryId,
        liveCategoryScores.gameId,
      ],
      set: { voteCount },
    });
}

async function processDirtyKeys(year: number, db: Db) {
  const dirtyGames = await db
    .select()
    .from(liveGotyDirtyGames)
    .where(eq(liveGotyDirtyGames.year, year));

  for (const row of dirtyGames) {
    await upsertGotyScoreFromContrib(year, row.gameId, db);
    await db
      .delete(liveGotyDirtyGames)
      .where(
        and(
          eq(liveGotyDirtyGames.year, year),
          eq(liveGotyDirtyGames.gameId, row.gameId),
        ),
      );
  }

  const dirtyCats = await db
    .select()
    .from(liveCategoryDirty)
    .where(eq(liveCategoryDirty.year, year));

  for (const row of dirtyCats) {
    await upsertCategoryScoreFromContrib(
      year,
      row.categoryId,
      row.gameId,
      db,
    );
    await db
      .delete(liveCategoryDirty)
      .where(
        and(
          eq(liveCategoryDirty.year, year),
          eq(liveCategoryDirty.categoryId, row.categoryId),
          eq(liveCategoryDirty.gameId, row.gameId),
        ),
      );
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
): Promise<{ refreshed: boolean; reason?: string }> {
  const locked = await tryAcquireRefreshLock(year, db);
  if (!locked) return { refreshed: false, reason: "lock_held" };

  try {
    await processDirtyKeys(year, db);

    if ((await remainingDirtyCount(year, db)) > 0) {
      return { refreshed: true, reason: "partial_dirty_remaining" };
    }

    const [stats] = await db
      .select()
      .from(liveGotyYearStats)
      .where(eq(liveGotyYearStats.year, year))
      .limit(1);

    await refreshListCount(year, db);

    if (!stats || stats.contribGeneration <= stats.scoresGeneration) {
      return { refreshed: true, reason: "already_current" };
    }

    await db
      .update(liveGotyYearStats)
      .set({
        scoresGeneration: stats.contribGeneration,
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
    await db.delete(liveGotyScores).where(eq(liveGotyScores.year, year));
    await db
      .delete(liveCategoryScores)
      .where(eq(liveCategoryScores.year, year));
    await db
      .delete(liveGotyDirtyGames)
      .where(eq(liveGotyDirtyGames.year, year));
    await db
      .delete(liveCategoryDirty)
      .where(eq(liveCategoryDirty.year, year));

    const gotyGroups = await db
      .select({
        gameId: liveGotyContrib.gameId,
        score: sql<number>`coalesce(sum(${liveGotyContrib.points}), 0)::int`,
        listMentions: count(),
        rank1Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 1 then 1 else 0 end), 0)::int`,
        rank2Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 2 then 1 else 0 end), 0)::int`,
        rank3Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 3 then 1 else 0 end), 0)::int`,
        rank4Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 4 then 1 else 0 end), 0)::int`,
        rank5Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 5 then 1 else 0 end), 0)::int`,
        rank6Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 6 then 1 else 0 end), 0)::int`,
        rank7Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 7 then 1 else 0 end), 0)::int`,
        rank8Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 8 then 1 else 0 end), 0)::int`,
        rank9Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 9 then 1 else 0 end), 0)::int`,
        rank10Count: sql<number>`coalesce(sum(case when ${liveGotyContrib.rank} = 10 then 1 else 0 end), 0)::int`,
      })
      .from(liveGotyContrib)
      .where(eq(liveGotyContrib.year, year))
      .groupBy(liveGotyContrib.gameId);

    if (gotyGroups.length > 0) {
      await db.insert(liveGotyScores).values(
        gotyGroups.map((g) => ({
          year,
          gameId: g.gameId,
          score: Number(g.score),
          listMentions: Number(g.listMentions),
          rank1Count: Number(g.rank1Count),
          rank2Count: Number(g.rank2Count),
          rank3Count: Number(g.rank3Count),
          rank4Count: Number(g.rank4Count),
          rank5Count: Number(g.rank5Count),
          rank6Count: Number(g.rank6Count),
          rank7Count: Number(g.rank7Count),
          rank8Count: Number(g.rank8Count),
          rank9Count: Number(g.rank9Count),
          rank10Count: Number(g.rank10Count),
        })),
      );
    }

    const catGroups = await db
      .select({
        categoryId: liveCategoryContrib.categoryId,
        gameId: liveCategoryContrib.gameId,
        voteCount: count(),
      })
      .from(liveCategoryContrib)
      .where(eq(liveCategoryContrib.year, year))
      .groupBy(liveCategoryContrib.categoryId, liveCategoryContrib.gameId);

    if (catGroups.length > 0) {
      await db.insert(liveCategoryScores).values(
        catGroups.map((g) => ({
          year,
          categoryId: g.categoryId,
          gameId: g.gameId,
          voteCount: Number(g.voteCount),
        })),
      );
    }

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
