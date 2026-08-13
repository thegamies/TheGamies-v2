/** Rank-1 podium cover art (px). */
export const PODIUM_COVER = { width: 206, height: 275 } as const;

/** Matrix / strip cards — half of podium cover (px). Default / small screens. */
export const MATRIX_COVER = {
  width: Math.round(PODIUM_COVER.width / 2),
  height: Math.round(PODIUM_COVER.height / 2),
} as const;

/** Comparison strips from `lg` up — full podium cover size. */
export const MATRIX_COVER_WIDE = PODIUM_COVER;
