/** Default homepage years when admin has not set an override. */
export function defaultLandingStandingsYears(
  now: Date = new Date(),
): number[] {
  const year = now.getUTCFullYear();
  return [year, year - 1];
}

/**
 * Normalize an admin override: unique integers, newest first.
 * Empty / null / invalid → fall back to default current + previous.
 */
export function resolveLandingStandingsYears(
  override: readonly number[] | null | undefined,
  now: Date = new Date(),
): number[] {
  if (!override || override.length === 0) {
    return defaultLandingStandingsYears(now);
  }
  const years = [
    ...new Set(
      override
        .map((y) => Math.floor(Number(y)))
        .filter((y) => Number.isFinite(y) && y >= 1970 && y <= 2100),
    ),
  ].sort((a, b) => b - a);
  return years.length > 0 ? years : defaultLandingStandingsYears(now);
}

/** Parse a comma/space-separated year list from admin input. */
export function parseLandingYearsInput(raw: string): number[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[\s,]+/).filter(Boolean);
  const years = parts.map((p) => Math.floor(Number(p)));
  if (years.some((y) => !Number.isFinite(y))) {
    throw new Error("Enter years as numbers, separated by commas.");
  }
  return resolveLandingStandingsYears(years);
}
