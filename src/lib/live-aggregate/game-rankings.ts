import { eq, sql } from "drizzle-orm";
import { games, type Db } from "@thegamies/db";
import { getLiveAggregateDb } from "./contrib";

export type GameGotyYearRanking = {
  year: number;
  rank: number;
  votes: number | null;
  score: number | null;
  /** Length 10: votes at list positions 1–10. Null when scores are hidden. */
  votesByRank: number[] | null;
  detailedStatsRevealed: boolean;
};

export type GameGotyRankings = {
  byYear: GameGotyYearRanking[];
  viaParent: { slug: string; title: string } | null;
};

export function hasGameGotyPresence(stats: GameGotyRankings): boolean {
  return stats.byYear.some(
    (year) =>
      year.rank > 0 ||
      (year.detailedStatsRevealed &&
        ((year.score ?? 0) > 0 || (year.votes ?? 0) > 0)),
  );
}

export function redactGameGotyYearRanking(
  row: GameGotyYearRanking,
): GameGotyYearRanking {
  if (row.detailedStatsRevealed) return row;
  return {
    ...row,
    votes: null,
    score: null,
    votesByRank: null,
  };
}

function asInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true";
}

type ScoreRow = {
  year: unknown;
  score: unknown;
  listMentions: unknown;
  rank1Count: unknown;
  rank2Count: unknown;
  rank3Count: unknown;
  rank4Count: unknown;
  rank5Count: unknown;
  rank6Count: unknown;
  rank7Count: unknown;
  rank8Count: unknown;
  rank9Count: unknown;
  rank10Count: unknown;
  detailedStatsRevealed: unknown;
  higherCount: unknown;
};

function mapScoreRow(row: ScoreRow): GameGotyYearRanking {
  const detailedStatsRevealed = asBool(row.detailedStatsRevealed);
  const votesByRank = [
    asInt(row.rank1Count),
    asInt(row.rank2Count),
    asInt(row.rank3Count),
    asInt(row.rank4Count),
    asInt(row.rank5Count),
    asInt(row.rank6Count),
    asInt(row.rank7Count),
    asInt(row.rank8Count),
    asInt(row.rank9Count),
    asInt(row.rank10Count),
  ];
  return redactGameGotyYearRanking({
    year: asInt(row.year),
    rank: asInt(row.higherCount) + 1,
    votes: asInt(row.listMentions),
    score: asInt(row.score),
    votesByRank,
    detailedStatsRevealed,
  });
}

/** Site live GOTY rows for one game — not the full year board. */
export async function getGameGotyRankings(
  gameId: string,
  db: Db = getLiveAggregateDb(),
): Promise<GameGotyYearRanking[]> {
  const result = await db.execute(sql`
    select
      s.year,
      s.score,
      s.list_mentions as "listMentions",
      s.rank_1_count as "rank1Count",
      s.rank_2_count as "rank2Count",
      s.rank_3_count as "rank3Count",
      s.rank_4_count as "rank4Count",
      s.rank_5_count as "rank5Count",
      s.rank_6_count as "rank6Count",
      s.rank_7_count as "rank7Count",
      s.rank_8_count as "rank8Count",
      s.rank_9_count as "rank9Count",
      s.rank_10_count as "rank10Count",
      coalesce(ys.detailed_stats_revealed, false) as "detailedStatsRevealed",
      case
        when coalesce(ss.rank_mode, 'competition') = 'dense' then (
          select count(distinct hs.score)::int
          from live_goty_scores hs
          where hs.year = s.year
            and hs.score > s.score
        )
        else (
          select count(*)::int
          from live_goty_scores hs
          where hs.year = s.year
            and hs.score > s.score
        )
      end as "higherCount"
    from live_goty_scores s
    left join live_goty_year_stats ys on ys.year = s.year
    left join site_settings ss on ss.id = 'default'
    where s.game_id = ${gameId}
    order by s.year desc
  `);

  return (result.rows as ScoreRow[]).map(mapScoreRow);
}

async function getGameRefByIgdbId(
  igdbId: number,
  db: Db,
): Promise<{ id: string; slug: string; title: string } | null> {
  const [row] = await db
    .select({
      id: games.id,
      slug: games.slug,
      title: games.title,
    })
    .from(games)
    .where(eq(games.igdbId, igdbId))
    .limit(1);
  return row ?? null;
}

/**
 * Rankings for a game page. Editions with no scores inherit the parent’s
 * board (same as the prior Games detail). Bounded: this game’s years only.
 */
export async function getGameDetailGotyRankings(
  game: {
    id: string;
    versionParentIgdbId: number | null;
    parentGameIgdbId: number | null;
  },
  db: Db = getLiveAggregateDb(),
): Promise<GameGotyRankings> {
  const own = await getGameGotyRankings(game.id, db);
  const ownStats: GameGotyRankings = { byYear: own, viaParent: null };
  if (hasGameGotyPresence(ownStats)) return ownStats;

  const inheritIgdb = game.versionParentIgdbId ?? game.parentGameIgdbId;
  if (inheritIgdb == null) return ownStats;

  const parent = await getGameRefByIgdbId(inheritIgdb, db);
  if (!parent || parent.id === game.id) return ownStats;

  const inherited = await getGameGotyRankings(parent.id, db);
  const inheritedStats: GameGotyRankings = {
    byYear: inherited,
    viaParent: { slug: parent.slug, title: parent.title },
  };
  return hasGameGotyPresence(inheritedStats)
    ? inheritedStats
    : { byYear: [], viaParent: null };
}
