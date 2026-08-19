export const DEFAULT_STANDING_FILL_MIN_VISIBLE = 2.2;
export const STANDING_FILL_MIN_VISIBLE_MIN = 1;
export const STANDING_FILL_MIN_VISIBLE_MAX = 5;
/** Redeclares `--standing-fill-card` so a local covers-in-view count is used. */
export const STANDING_FILL_SCOPE_CLASS = "standing-fill-scope";

/**
 * How many fill-row covers sit in the viewport, including a fractional peek.
 * Invalid input falls back to the default; out-of-range values clamp.
 */
export function parseStandingFillMinVisible(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_STANDING_FILL_MIN_VISIBLE;
  const rounded = Math.round(n * 10) / 10;
  if (rounded < STANDING_FILL_MIN_VISIBLE_MIN) {
    return DEFAULT_STANDING_FILL_MIN_VISIBLE;
  }
  return Math.min(rounded, STANDING_FILL_MIN_VISIBLE_MAX);
}

export function standingFillMinVisibleVars(minVisible: number): {
  "--standing-fill-min-visible": string;
} {
  return {
    "--standing-fill-min-visible": String(
      parseStandingFillMinVisible(minVisible),
    ),
  };
}
