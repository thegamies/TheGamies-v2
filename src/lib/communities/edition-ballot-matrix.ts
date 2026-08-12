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
};

export type MatrixStandingLine = MatrixGameCell & {
  place: number;
};

export type MatrixVoterRankLine = MatrixGameCell & {
  profileId: string;
  rank: number;
};

export type EditionBallotMatrixRow = {
  rank: number;
  you: MatrixGameCell | null;
  community: MatrixGameCell | null;
  voices: MatrixGameCell | null;
  voiceGames: Record<string, MatrixGameCell | null>;
};

function slotByPlace(
  lines: MatrixStandingLine[],
  top: number,
): Array<MatrixGameCell | null> {
  const slots: Array<MatrixGameCell | null> = Array.from(
    { length: top },
    () => null,
  );
  for (const line of lines) {
    if (line.place < 1 || line.place > top) continue;
    slots[line.place - 1] = {
      gameId: line.gameId,
      slug: line.slug,
      title: line.title,
      coverUrl: line.coverUrl,
    };
  }
  return slots;
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
    slots[line.rank - 1] = {
      gameId: line.gameId,
      slug: line.slug,
      title: line.title,
      coverUrl: line.coverUrl,
    };
  }
  return slots;
}

/**
 * Build rank 1…top rows. Each column is that source’s top list (games per rank).
 */
export function assembleBallotMatrixRows(input: {
  community: MatrixStandingLine[];
  voices: MatrixStandingLine[];
  voiceColumns: MatrixVoiceColumn[];
  voterRanks: MatrixVoterRankLine[];
  viewerProfileId: string | null;
  includeYou: boolean;
  top?: number;
}): EditionBallotMatrixRow[] {
  const top = input.top ?? BALLOT_MATRIX_TOP;
  const community = slotByPlace(input.community, top);
  const voices = slotByPlace(input.voices, top);
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
      community: community[i] ?? null,
      voices: voices[i] ?? null,
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
      row.community != null ||
      row.voices != null ||
      Object.values(row.voiceGames).some((g) => g != null),
  );
}
