/** Viewer numbering: competition = SQL RANK (1–1–3); dense = DENSE_RANK (1–1–2). */
export type SharedRankMode = "competition" | "dense";

export function parseSharedRankMode(
  raw: string | undefined,
): SharedRankMode {
  return raw === "dense" ? "dense" : "competition";
}

/**
 * Ranks for a list already sorted best-first (higher score first).
 * Equal scores share a rank. Competition skips; dense does not.
 */
export function ranksForSortedScores(
  scores: readonly number[],
  mode: SharedRankMode,
): number[] {
  const ranks = new Array<number>(scores.length);
  let i = 0;
  let groupIndex = 0;
  while (i < scores.length) {
    const score = scores[i]!;
    const start = i;
    while (i < scores.length && scores[i] === score) i += 1;
    groupIndex += 1;
    const rank = mode === "dense" ? groupIndex : start + 1;
    for (let j = start; j < i; j += 1) ranks[j] = rank;
  }
  return ranks;
}

/**
 * Number a page that may start mid-tie.
 * `firstGroupRank` is 1 + count of strictly higher scores (competition)
 * or 1 + count of distinct higher scores (dense).
 */
export function ranksForSortedPage(
  scores: readonly number[],
  opts: {
    offset: number;
    firstGroupRank: number;
    mode: SharedRankMode;
  },
): number[] {
  if (scores.length === 0) return [];
  const ranks = new Array<number>(scores.length);
  const first = scores[0]!;
  let i = 0;
  while (i < scores.length && scores[i] === first) {
    ranks[i] = opts.firstGroupRank;
    i += 1;
  }
  if (opts.mode === "dense") {
    let groupIndex = opts.firstGroupRank;
    while (i < scores.length) {
      const score = scores[i]!;
      const start = i;
      while (i < scores.length && scores[i] === score) i += 1;
      groupIndex += 1;
      for (let j = start; j < i; j += 1) ranks[j] = groupIndex;
    }
    return ranks;
  }
  while (i < scores.length) {
    const score = scores[i]!;
    const start = i;
    while (i < scores.length && scores[i] === score) i += 1;
    const rank = opts.offset + start + 1;
    for (let j = start; j < i; j += 1) ranks[j] = rank;
  }
  return ranks;
}

export function withDisplayRanks<T>(
  rows: readonly T[],
  scoreOf: (row: T) => number,
  mode: SharedRankMode,
): Array<T & { rank: number }> {
  const ranks = ranksForSortedScores(rows.map(scoreOf), mode);
  return rows.map((row, i) => ({ ...row, rank: ranks[i]! }));
}

export function withDisplayRanksOnPage<T>(
  rows: readonly T[],
  scoreOf: (row: T) => number,
  opts: {
    offset: number;
    firstGroupRank: number;
    mode: SharedRankMode;
  },
): Array<T & { rank: number }> {
  const ranks = ranksForSortedPage(rows.map(scoreOf), opts);
  return rows.map((row, i) => ({ ...row, rank: ranks[i]! }));
}

export function groupByRank<T extends { rank: number }>(
  rows: readonly T[],
): Array<{ rank: number; rows: T[] }> {
  const groups: Array<{ rank: number; rows: T[] }> = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.rank === row.rank) last.rows.push(row);
    else groups.push({ rank: row.rank, rows: [row] });
  }
  return groups;
}
