import { pointsForRank } from "@/lib/lists/scoring";

export type EditionResultMode = "combined" | "community" | "voices";

/** Public UI modes until weighted Combined exists. */
export type EditionResultsPublicMode = "community" | "voices";

/** Combined (legacy URL) and community share storage rows. */
export function storageModeFor(
  mode: EditionResultMode,
): "community" | "voices" {
  return mode === "voices" ? "voices" : "community";
}

export function parseEditionResultMode(
  raw: string | undefined,
): EditionResultsPublicMode {
  if (raw === "voices") return "voices";
  // "combined" redirects to community until weighted Combined ships
  return "community";
}

export type RankedBallotLine = {
  profileId: string;
  gameId: string;
  rank: number;
};

export type GameMeta = {
  gameId: string;
  slug: string;
  title: string;
  gameYear: number | null;
  coverUrl: string | null;
};

export type AggregatedGotyRow = GameMeta & {
  place: number;
  points: number;
  firstPlaceVotes: number;
  appearances: number;
};

export type CategoryVoteLine = {
  profileId: string;
  categoryId: string;
  gameId: string;
};

export type AggregatedCategoryRow = GameMeta & {
  categoryId: string;
  place: number;
  votes: number;
};

/**
 * Aggregate GOTY points for a ballot pool (top-10 pointsForRank).
 * Tie-break: more points, then more #1s, then more appearances, then gameId.
 */
export function aggregateEditionGoty(
  lines: RankedBallotLine[],
  games: Map<string, GameMeta>,
  profileFilter?: Set<string>,
): AggregatedGotyRow[] {
  const byGame = new Map<
    string,
    { points: number; firstPlaceVotes: number; appearances: number }
  >();

  for (const line of lines) {
    if (profileFilter && !profileFilter.has(line.profileId)) continue;
    const pts = pointsForRank(line.rank);
    if (pts <= 0 && line.rank > 10) continue;
    if (line.rank > 10) continue;

    const cur = byGame.get(line.gameId) ?? {
      points: 0,
      firstPlaceVotes: 0,
      appearances: 0,
    };
    cur.points += pts;
    cur.appearances += 1;
    if (line.rank === 1) cur.firstPlaceVotes += 1;
    byGame.set(line.gameId, cur);
  }

  const rows: AggregatedGotyRow[] = [];
  for (const [gameId, stats] of byGame) {
    if (stats.points <= 0) continue;
    const meta = games.get(gameId);
    if (!meta) continue;
    rows.push({
      ...meta,
      place: 0,
      points: stats.points,
      firstPlaceVotes: stats.firstPlaceVotes,
      appearances: stats.appearances,
    });
  }

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.firstPlaceVotes !== a.firstPlaceVotes) {
      return b.firstPlaceVotes - a.firstPlaceVotes;
    }
    if (b.appearances !== a.appearances) return b.appearances - a.appearances;
    return a.gameId.localeCompare(b.gameId);
  });

  return rows.map((row, i) => ({ ...row, place: i + 1 }));
}

/** Plurality category tallies; tie-break votes then gameId. */
export function aggregateEditionCategories(
  votes: CategoryVoteLine[],
  games: Map<string, GameMeta>,
  profileFilter?: Set<string>,
): AggregatedCategoryRow[] {
  const byKey = new Map<string, { categoryId: string; gameId: string; votes: number }>();

  for (const vote of votes) {
    if (profileFilter && !profileFilter.has(vote.profileId)) continue;
    const key = `${vote.categoryId}:${vote.gameId}`;
    const cur = byKey.get(key) ?? {
      categoryId: vote.categoryId,
      gameId: vote.gameId,
      votes: 0,
    };
    cur.votes += 1;
    byKey.set(key, cur);
  }

  const byCategory = new Map<string, AggregatedCategoryRow[]>();
  for (const entry of byKey.values()) {
    const meta = games.get(entry.gameId);
    if (!meta) continue;
    const list = byCategory.get(entry.categoryId) ?? [];
    list.push({
      ...meta,
      categoryId: entry.categoryId,
      place: 0,
      votes: entry.votes,
    });
    byCategory.set(entry.categoryId, list);
  }

  const out: AggregatedCategoryRow[] = [];
  for (const list of byCategory.values()) {
    list.sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.gameId.localeCompare(b.gameId);
    });
    list.forEach((row, i) => {
      out.push({ ...row, place: i + 1 });
    });
  }
  return out;
}
