import { pointsForRank } from "@/lib/lists/scoring";

export { pointsForRank };

export type RankedItemForContrib = {
  gameId: string;
  rank: number;
  isAdult?: boolean;
};

export type GotyContribRow = {
  gameId: string;
  rank: number;
  points: number;
};

/** Build ≤10 scored contrib rows from ranked list items (skips adult / zero-point ranks). */
export function buildGotyContribRows(
  items: RankedItemForContrib[],
): GotyContribRow[] {
  const rows: GotyContribRow[] = [];
  for (const item of items) {
    if (item.isAdult) continue;
    const points = pointsForRank(item.rank);
    if (points <= 0) continue;
    rows.push({ gameId: item.gameId, rank: item.rank, points });
  }
  return rows;
}

export type DirtyGotyKey = { year: number; gameId: string };
export type DirtyCategoryKey = {
  year: number;
  categoryId: string;
  gameId: string;
};

export function mergeDirtyGotyKeys(
  oldRows: { year: number; gameId: string }[],
  newRows: { year: number; gameId: string }[],
): DirtyGotyKey[] {
  const map = new Map<string, DirtyGotyKey>();
  for (const row of [...oldRows, ...newRows]) {
    map.set(`${row.year}:${row.gameId}`, {
      year: row.year,
      gameId: row.gameId,
    });
  }
  return [...map.values()];
}

export function mergeDirtyCategoryKeys(
  oldRows: { year: number; categoryId: string; gameId: string }[],
  newRows: { year: number; categoryId: string; gameId: string }[],
): DirtyCategoryKey[] {
  const map = new Map<string, DirtyCategoryKey>();
  for (const row of [...oldRows, ...newRows]) {
    map.set(`${row.year}:${row.categoryId}:${row.gameId}`, {
      year: row.year,
      categoryId: row.categoryId,
      gameId: row.gameId,
    });
  }
  return [...map.values()];
}

/** Absolute aggregate of contrib rows for one game (pure; used in tests + refresh). */
export function aggregateGotyContribForGame(
  rows: { rank: number; points: number }[],
): {
  score: number;
  listMentions: number;
  rankCounts: number[];
} {
  const rankCounts = Array.from({ length: 10 }, () => 0);
  let score = 0;
  for (const row of rows) {
    score += row.points;
    if (row.rank >= 1 && row.rank <= 10) {
      rankCounts[row.rank - 1] += 1;
    }
  }
  return { score, listMentions: rows.length, rankCounts };
}

/**
 * Later: community live boards sum contrib for member profile ids.
 * Site boards use live_goty_scores; communities should not read that table.
 */
export function sumContribForProfiles(
  rows: { profileId: string; points: number; gameId: string }[],
  profileIds: Iterable<string>,
): Map<string, number> {
  const allowed = new Set(profileIds);
  const scores = new Map<string, number>();
  for (const row of rows) {
    if (!allowed.has(row.profileId)) continue;
    scores.set(row.gameId, (scores.get(row.gameId) ?? 0) + row.points);
  }
  return scores;
}
