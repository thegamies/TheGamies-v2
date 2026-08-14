/** Pure assembly: parallel top-10 lists (rank rows × source columns). */

export const BALLOT_MATRIX_TOP = 10;

export type MatrixVoiceColumn = {
  profileId: string;
  displayName: string;
  username: string;
};

export type MatrixGameCell = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  /** Aggregate points when cell is Community / Voices standings. */
  points?: number | null;
};

export type MatrixStandingLine = MatrixGameCell & {
  place: number;
  /** Used to detect Community / Voices ties (equal points share a slot). */
  points: number;
};

export type MatrixVoterRankLine = MatrixGameCell & {
  profileId: string;
  rank: number;
};

export type EditionBallotMatrixRow = {
  rank: number;
  you: MatrixGameCell | null;
  /** Community games at this competition place (2+ = points tie). */
  community: MatrixGameCell[];
  /** Voices aggregate games at this competition place (2+ = points tie). */
  voices: MatrixGameCell[];
  voiceGames: Record<string, MatrixGameCell | null>;
};

function toCell(
  line: MatrixGameCell & { points?: number | null },
): MatrixGameCell {
  return {
    gameId: line.gameId,
    slug: line.slug,
    title: line.title,
    coverUrl: line.coverUrl,
    ...(line.points != null ? { points: line.points } : {}),
  };
}

/**
 * Competition ranking by points: equal points share a slot; next distinct
 * score skips (e.g. 1–1–3). Lines must be sorted best-first (place asc).
 */
export function slotByCompetitionPoints(
  lines: MatrixStandingLine[],
  top: number,
): MatrixGameCell[][] {
  const slots: MatrixGameCell[][] = Array.from({ length: top }, () => []);
  const sorted = sortStandingLines(lines);

  let i = 0;
  while (i < sorted.length) {
    const points = sorted[i]!.points;
    const start = i;
    while (i < sorted.length && sorted[i]!.points === points) i += 1;
    const competitionPlace = start + 1;
    if (competitionPlace > top) break;
    slots[competitionPlace - 1] = sorted.slice(start, i).map(toCell);
  }
  return slots;
}

/**
 * Board-order span: a K-way tie starting at ordinal index I fills slots
 * I…I+K−1 with the same group (e.g. two #1s appear in both #1 and #2).
 */
export function slotByOrdinalSpan(
  lines: MatrixStandingLine[],
  top: number,
): MatrixGameCell[][] {
  const slots: MatrixGameCell[][] = Array.from({ length: top }, () => []);
  const sorted = sortStandingLines(lines);

  let i = 0;
  while (i < sorted.length) {
    const points = sorted[i]!.points;
    const start = i;
    while (i < sorted.length && sorted[i]!.points === points) i += 1;
    const group = sorted.slice(start, i).map(toCell);
    for (let slot = start; slot < i && slot < top; slot += 1) {
      slots[slot] = group;
    }
    if (start >= top) break;
  }
  return slots;
}

/**
 * Dense ranking by points: equal points share a slot; next distinct
 * score is the next number (e.g. 1–1–2).
 */
export function slotByDensePoints(
  lines: MatrixStandingLine[],
  top: number,
): MatrixGameCell[][] {
  const slots: MatrixGameCell[][] = Array.from({ length: top }, () => []);
  const sorted = sortStandingLines(lines);

  let i = 0;
  let groupIndex = 0;
  while (i < sorted.length) {
    const points = sorted[i]!.points;
    const start = i;
    while (i < sorted.length && sorted[i]!.points === points) i += 1;
    groupIndex += 1;
    if (groupIndex > top) break;
    slots[groupIndex - 1] = sorted.slice(start, i).map(toCell);
  }
  return slots;
}

export type GotyTieSlotMode = "competition" | "span" | "dense";

function sortStandingLines(lines: MatrixStandingLine[]): MatrixStandingLine[] {
  return [...lines].sort((a, b) => {
    if (a.place !== b.place) return a.place - b.place;
    if (b.points !== a.points) return b.points - a.points;
    return a.gameId.localeCompare(b.gameId);
  });
}

function slotByRank(
  lines: MatrixVoterRankLine[],
  profileId: string,
  top: number,
): Array<MatrixGameCell | null> {
  const slots: Array<MatrixGameCell | null> = Array.from(
    { length: top },
    () => null,
  );
  for (const line of lines) {
    if (line.profileId !== profileId) continue;
    if (line.rank < 1 || line.rank > top) continue;
    slots[line.rank - 1] = toCell(line);
  }
  return slots;
}

/**
 * Build rank 1…top rows. Community / Voices use tie slotting;
 * You and each Voice stay single-pick ballot ranks.
 */
export function assembleBallotMatrixRows(input: {
  community: MatrixStandingLine[];
  voices: MatrixStandingLine[];
  voiceColumns: MatrixVoiceColumn[];
  voterRanks: MatrixVoterRankLine[];
  viewerProfileId: string | null;
  includeYou: boolean;
  top?: number;
  /** Default `competition` (1–1–3). `span` fills every ordinal the tie occupies. */
  tieMode?: GotyTieSlotMode;
}): EditionBallotMatrixRow[] {
  const top = input.top ?? BALLOT_MATRIX_TOP;
  const slotStanding =
    input.tieMode === "span"
      ? slotByOrdinalSpan
      : input.tieMode === "dense"
        ? slotByDensePoints
        : slotByCompetitionPoints;
  const community = slotStanding(input.community, top);
  const voices = slotStanding(input.voices, top);
  const you =
    input.includeYou && input.viewerProfileId
      ? slotByRank(input.voterRanks, input.viewerProfileId, top)
      : null;

  const byVoice = new Map<string, Array<MatrixGameCell | null>>();
  for (const col of input.voiceColumns) {
    byVoice.set(col.profileId, slotByRank(input.voterRanks, col.profileId, top));
  }

  const rows: EditionBallotMatrixRow[] = [];
  for (let i = 0; i < top; i++) {
    const voiceGames: Record<string, MatrixGameCell | null> = {};
    for (const col of input.voiceColumns) {
      voiceGames[col.profileId] = byVoice.get(col.profileId)?.[i] ?? null;
    }
    rows.push({
      rank: i + 1,
      you: you ? (you[i] ?? null) : null,
      community: community[i] ?? [],
      voices: voices[i] ?? [],
      voiceGames,
    });
  }
  return rows;
}

/** True when any column has at least one game in the top list. */
export function matrixHasAnyGames(rows: EditionBallotMatrixRow[]): boolean {
  return rows.some(
    (row) =>
      row.you != null ||
      row.community.length > 0 ||
      row.voices.length > 0 ||
      Object.values(row.voiceGames).some((g) => g != null),
  );
}

export type EditionCategoryComparisonRow = {
  categoryId: string;
  label: string;
  you: MatrixGameCell | null;
  community: MatrixGameCell[];
  voices: MatrixGameCell[];
  voiceGames: Record<string, MatrixGameCell | null>;
};

export type CategoryComparisonPickLine = MatrixGameCell & {
  profileId: string;
  categoryId: string;
};

/**
 * Award rows × You / Community / Voices / each Voice (one pick or #1 per cell).
 */
export function assembleCategoryComparisonRows(input: {
  categories: Array<{ categoryId: string; label: string }>;
  communityByCategory: Record<string, MatrixGameCell[] | undefined>;
  voicesByCategory: Record<string, MatrixGameCell[] | undefined>;
  picks: CategoryComparisonPickLine[];
  voiceColumns: MatrixVoiceColumn[];
  viewerProfileId: string | null;
  includeYou: boolean;
}): EditionCategoryComparisonRow[] {
  const pickFor = (
    categoryId: string,
    profileId: string,
  ): MatrixGameCell | null => {
    const line = input.picks.find(
      (p) => p.categoryId === categoryId && p.profileId === profileId,
    );
    if (!line) return null;
    return {
      gameId: line.gameId,
      slug: line.slug,
      title: line.title,
      coverUrl: line.coverUrl,
    };
  };

  return input.categories.map((cat) => {
    const voiceGames: Record<string, MatrixGameCell | null> = {};
    for (const col of input.voiceColumns) {
      voiceGames[col.profileId] = pickFor(cat.categoryId, col.profileId);
    }
    return {
      categoryId: cat.categoryId,
      label: cat.label,
      you:
        input.includeYou && input.viewerProfileId
          ? pickFor(cat.categoryId, input.viewerProfileId)
          : null,
      community: input.communityByCategory[cat.categoryId] ?? [],
      voices: input.voicesByCategory[cat.categoryId] ?? [],
      voiceGames,
    };
  });
}

export function categoryComparisonHasGames(
  rows: EditionCategoryComparisonRow[],
): boolean {
  return rows.some(
    (row) =>
      row.you != null ||
      row.community.length > 0 ||
      row.voices.length > 0 ||
      Object.values(row.voiceGames).some((g) => g != null),
  );
}
