export const TGA_STATUSES = [
  "off",
  "draft",
  "scheduled",
  "open",
  "locked",
] as const;

export type TgaStatus = (typeof TGA_STATUSES)[number];

export type TgaYearSchedule = {
  enabled: boolean;
  opensAt?: Date | null;
  showStartsAt?: Date | null;
};

export function computeTgaStatus(
  year: TgaYearSchedule,
  now: Date = new Date(),
): TgaStatus {
  if (!year.enabled) return "off";
  const { opensAt, showStartsAt } = year;
  if (!opensAt || !showStartsAt) return "draft";
  const t = now.getTime();
  if (t < opensAt.getTime()) return "scheduled";
  if (t < showStartsAt.getTime()) return "open";
  return "locked";
}

export function validateTgaSchedule(
  opensAt: Date,
  showStartsAt: Date,
): string | null {
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(showStartsAt.getTime())) {
    return "Pick valid open and show-start times.";
  }
  if (!(opensAt.getTime() < showStartsAt.getTime())) {
    return "Picks must open before the show starts.";
  }
  return null;
}

export function picksAreOpen(
  year: TgaYearSchedule,
  now: Date = new Date(),
): boolean {
  return computeTgaStatus(year, now) === "open";
}

/** Nominee sheet is only for open picks and after lock. */
export function tgaBallotVisible(
  year: TgaYearSchedule,
  now: Date = new Date(),
): boolean {
  const status = computeTgaStatus(year, now);
  return status === "open" || status === "locked";
}

/** Official calls and scored standings only after the show starts. */
export function revealTgaWinners(
  year: TgaYearSchedule,
  now: Date = new Date(),
): boolean {
  return computeTgaStatus(year, now) === "locked";
}

export function publicYearVisible(year: { enabled: boolean }): boolean {
  return year.enabled;
}

export function chromePromoted(year: {
  enabled: boolean;
  promoted: boolean;
}): boolean {
  return year.enabled && year.promoted;
}

export type TgaNomineeCheck = {
  kind: "game" | "other";
  nomineeCount: number;
  gameNomineesMissingGame: number;
  otherNomineesMissingArt: number;
};

export function slateCompleteReason(
  categories: TgaNomineeCheck[],
  schedule: { opensAt?: Date | null; showStartsAt?: Date | null },
): string | null {
  if (!schedule.opensAt || !schedule.showStartsAt) {
    return "Set when picks open and when the show starts.";
  }
  if (categories.length === 0) {
    return "Add at least one category.";
  }
  for (const category of categories) {
    if (category.nomineeCount < 1) {
      return "Every category needs at least one nominee.";
    }
    if (category.kind === "game" && category.gameNomineesMissingGame > 0) {
      return "Game categories need catalog games for every nominee.";
    }
  }
  return null;
}

export function tgaDeleteConfirmMatches(
  year: number,
  typed: unknown,
): boolean {
  return String(typed ?? "").trim() === String(year);
}

export function tgaStatusLabel(status: TgaStatus): string {
  switch (status) {
    case "off":
      return "Off";
    case "draft":
      return "Draft";
    case "scheduled":
      return "Scheduled";
    case "open":
      return "Picks open";
    case "locked":
      return "Locked";
  }
}
