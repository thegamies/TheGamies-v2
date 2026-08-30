export const TGA_POINTS_PER_CATEGORY = 1;
export const TGA_LEADERBOARD_PAGE_SIZE = 50;

export type TgaNomineeCallMark =
  | "uncalled"
  | "winner"
  | "correct"
  | "incorrect"
  | "other";

export function tgaNomineeCallMark(input: {
  nomineeId: string;
  winnerNomineeId: string | null;
  pickNomineeId: string | null | undefined;
}): TgaNomineeCallMark {
  const winnerId = input.winnerNomineeId;
  if (!winnerId) return "uncalled";
  const isWinner = input.nomineeId === winnerId;
  const isPick = input.pickNomineeId === input.nomineeId;
  if (isWinner && isPick) return "correct";
  if (isWinner) return "winner";
  if (isPick) return "incorrect";
  return "other";
}

export function tgaNomineeCallLabel(mark: TgaNomineeCallMark): string | null {
  switch (mark) {
    case "correct":
      return "Correct";
    case "incorrect":
      return "Incorrect";
    case "winner":
      return "Winner";
    default:
      return null;
  }
}

export function worldPremieresDelta(
  guess: number | null | undefined,
  official: number | null | undefined,
): number | null {
  if (
    guess == null ||
    official == null ||
    !Number.isFinite(guess) ||
    !Number.isFinite(official)
  ) {
    return null;
  }
  return Math.abs(Math.trunc(guess) - Math.trunc(official));
}

export function pointsAfterWinnerChange(input: {
  currentPoints: number;
  pickedOldWinner: boolean;
  pickedNewWinner: boolean;
}): number {
  let points = input.currentPoints;
  if (input.pickedOldWinner) points -= TGA_POINTS_PER_CATEGORY;
  if (input.pickedNewWinner) points += TGA_POINTS_PER_CATEGORY;
  return Math.max(0, points);
}

export function isStrictlyAhead(
  other: { points: number; wpDelta: number | null },
  row: { points: number; wpDelta: number | null },
): boolean {
  if (other.points !== row.points) return other.points > row.points;
  const otherDelta = other.wpDelta ?? Number.POSITIVE_INFINITY;
  const rowDelta = row.wpDelta ?? Number.POSITIVE_INFINITY;
  return otherDelta < rowDelta;
}

/** Competition place: 1–2–2–4. World Premieres breaks a points tie; equal WP shares the place. */
export function competitionPlace(
  row: { points: number; wpDelta: number | null },
  field: Array<{ points: number; wpDelta: number | null }>,
): number {
  return 1 + field.filter((other) => isStrictlyAhead(other, row)).length;
}

export function compareScoreRows(
  a: { points: number; wpDelta: number | null; profileId: string },
  b: { points: number; wpDelta: number | null; profileId: string },
): number {
  if (b.points !== a.points) return b.points - a.points;
  const aDelta = a.wpDelta ?? Number.POSITIVE_INFINITY;
  const bDelta = b.wpDelta ?? Number.POSITIVE_INFINITY;
  if (aDelta !== bDelta) return aDelta - bDelta;
  return a.profileId.localeCompare(b.profileId);
}

export function placeLabel(place: number): string {
  const hundred = place % 100;
  if (hundred >= 11 && hundred <= 13) return `${place}th`;
  switch (place % 10) {
    case 1:
      return `${place}st`;
    case 2:
      return `${place}nd`;
    case 3:
      return `${place}rd`;
    default:
      return `${place}th`;
  }
}

export function leaderboardPageCount(
  total: number,
  pageSize = TGA_LEADERBOARD_PAGE_SIZE,
): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}
