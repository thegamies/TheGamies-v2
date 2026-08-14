/** Short-viewport fit for Reveal — keep preferred sizes until the stage overflows. */

import { GOTY_REVEAL_TIED_PARK_Y_VH } from "./edition-reveal-motion";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Cover art is 3:4 — height / width. */
export const REVEAL_COVER_ASPECT = 4 / 3;

export const GOTY_REVEAL_FIT = {
  gap: 16,
  topInset: 8,
  bottomPad: 16,
  coverFloorFeatured: 96,
  coverFloorOther: 88,
  /** Today’s CSS minWidth on the cover link. */
  preferredMin: 112,
  featuredCap: 220,
  otherCap: 190,
  featuredVw: 0.48,
  otherVw: 0.44,
} as const;

export const CATEGORY_REVEAL_FIT = {
  mosaicFloor: 56,
  heroFloor: 96,
  soloFloor: 80,
  /** Keep mosaics off the viewport edge. */
  bottomPad: 28,
  gridMt: 8,
  editorialGap: 8,
  denseGap: 6,
  /** .category-reveal-title: mt + 2-line max-height. */
  mosaicTitleBlock: 20,
  mosaicTitleBlockMd: 27,
  /** Solo/hero cell title: mt-1.5 + 2× leading-snug. */
  heroTitleBlock: 56,
  heroTitleBlockSm: 62,
  soloTitleBlock: 50,
  soloTitleBlockSm: 56,
  mdMinPx: 768,
  smMinPx: 640,
  heroCap: 176,
  heroCapSm: 216,
  heroVw: 0.36,
  heroVwSm: 0.42,
  soloCap: 136,
  soloCapSm: 160,
  soloVw: 0.28,
  soloVwSm: 0.3,
} as const;

export function gotyRevealPreferredCoverW(
  featured: boolean,
  viewportWidth: number,
): number {
  const vw = Math.max(1, viewportWidth);
  const cap = featured
    ? GOTY_REVEAL_FIT.featuredCap
    : GOTY_REVEAL_FIT.otherCap;
  const frac = featured
    ? GOTY_REVEAL_FIT.featuredVw
    : GOTY_REVEAL_FIT.otherVw;
  return Math.max(GOTY_REVEAL_FIT.preferredMin, Math.min(vw * frac, cap));
}

export function gotyRevealCoverFloor(featured: boolean): number {
  return featured
    ? GOTY_REVEAL_FIT.coverFloorFeatured
    : GOTY_REVEAL_FIT.coverFloorOther;
}

export type GotyRevealFitInput = {
  stageH: number;
  preferredCoverW: number;
  parkedGlyphH: number;
  tiedH: number;
  coverFloor?: number;
  topInset?: number;
};

export type GotyRevealFit = {
  coverW: number;
  /** Parked rank / Tied offset from stage center (px, negative = up). */
  parkY: number;
  /** `parkY` as a fraction of stage height × 100, for Tied yVh interpolation. */
  parkYVh: number;
  scale: number;
};

function preferredParkY(stageH: number): number {
  return (GOTY_REVEAL_TIED_PARK_Y_VH / 100) * Math.max(1, stageH);
}

/**
 * Preferred cover + −24vh park on tall stages. Short stages raise the park
 * band (clamped under the header) then shrink the cover to keep a gap.
 */
export function gotyRevealFit(input: GotyRevealFitInput): GotyRevealFit {
  const stageH = Math.max(1, input.stageH);
  const preferredCoverW = Math.max(1, input.preferredCoverW);
  const floor = Math.max(
    1,
    input.coverFloor ?? GOTY_REVEAL_FIT.coverFloorFeatured,
  );
  const topInset = input.topInset ?? GOTY_REVEAL_FIT.topInset;
  const parkedHalf =
    Math.max(1, input.parkedGlyphH, input.tiedH) / 2;
  const minParkY = -stageH / 2 + topInset + parkedHalf;
  const { gap, bottomPad } = GOTY_REVEAL_FIT;

  const maxY = stageH / 2 - bottomPad - parkedHalf;
  let coverW = preferredCoverW;
  let coverH = coverW * REVEAL_COVER_ASPECT;
  const maxCoverHBottom = stageH - 2 * bottomPad;
  if (coverH > maxCoverHBottom) {
    coverW = clamp(maxCoverHBottom / REVEAL_COVER_ASPECT, floor, preferredCoverW);
    coverH = coverW * REVEAL_COVER_ASPECT;
  }

  const overlaps = (park: number, height: number) =>
    park + parkedHalf + gap > -height / 2 + 0.5;

  let parkY = preferredParkY(stageH);
  if (overlaps(parkY, coverH)) {
    parkY = clamp(-coverH / 2 - gap - parkedHalf, minParkY, maxY);
  }

  if (overlaps(parkY, coverH)) {
    const maxCoverH = Math.max(
      floor * REVEAL_COVER_ASPECT,
      -2 * (minParkY + parkedHalf + gap),
    );
    coverW = clamp(
      Math.min(coverW, maxCoverH / REVEAL_COVER_ASPECT),
      floor,
      preferredCoverW,
    );
    coverH = coverW * REVEAL_COVER_ASPECT;
    parkY = clamp(
      Math.min(preferredParkY(stageH), -coverH / 2 - gap - parkedHalf),
      minParkY,
      maxY,
    );
  }

  return {
    coverW,
    parkY,
    parkYVh: (parkY / stageH) * 100,
    scale: coverW / preferredCoverW,
  };
}

export type CategoryRevealPlaceFitInput = {
  stackRows: 1 | 2 | 3;
  preferredW: number;
  showTitles: boolean;
  hero: boolean;
  rowGap: number;
  titleBlockH: number;
  floor: number;
};

export type CategoryRevealAwardFitInput = {
  availableH: number;
  awardChromeH: number;
  placeHeadH: number;
  places: readonly CategoryRevealPlaceFitInput[];
};

export type CategoryRevealAwardFit = {
  scale: number;
  align: "center" | "start";
  widths: number[];
};

function placeColumnH(
  width: number,
  place: CategoryRevealPlaceFitInput,
  placeHeadH: number,
): number {
  const coverH = Math.max(1, width) * REVEAL_COVER_ASPECT;
  const titleH = place.showTitles ? place.titleBlockH : 0;
  const rows = place.stackRows;
  const mosaic =
    rows * (coverH + titleH) + Math.max(0, rows - 1) * place.rowGap;
  return placeHeadH + CATEGORY_REVEAL_FIT.gridMt + mosaic;
}

function maxWidthForBudget(
  place: CategoryRevealPlaceFitInput,
  mosaicBudget: number,
): number {
  const titleH = place.showTitles ? place.titleBlockH : 0;
  const rows = place.stackRows;
  const gaps = Math.max(0, rows - 1) * place.rowGap;
  const coverStack = mosaicBudget - gaps - rows * titleH;
  const coverH = coverStack / rows;
  return coverH / REVEAL_COVER_ASPECT;
}

export function categoryRevealTitleBlockH(
  kind: "mosaic" | "hero" | "solo",
  viewportWidth: number,
): number {
  const vw = Math.max(1, viewportWidth);
  if (kind === "mosaic") {
    return vw >= CATEGORY_REVEAL_FIT.mdMinPx
      ? CATEGORY_REVEAL_FIT.mosaicTitleBlockMd
      : CATEGORY_REVEAL_FIT.mosaicTitleBlock;
  }
  if (kind === "hero") {
    return vw >= CATEGORY_REVEAL_FIT.smMinPx
      ? CATEGORY_REVEAL_FIT.heroTitleBlockSm
      : CATEGORY_REVEAL_FIT.heroTitleBlock;
  }
  return vw >= CATEGORY_REVEAL_FIT.smMinPx
    ? CATEGORY_REVEAL_FIT.soloTitleBlockSm
    : CATEGORY_REVEAL_FIT.soloTitleBlock;
}

export function categoryRevealSoloPreferredW(
  hero: boolean,
  viewportWidth: number,
): number {
  const vw = Math.max(1, viewportWidth);
  const sm = vw >= CATEGORY_REVEAL_FIT.smMinPx;
  if (hero) {
    const cap = sm ? CATEGORY_REVEAL_FIT.heroCapSm : CATEGORY_REVEAL_FIT.heroCap;
    const frac = sm ? CATEGORY_REVEAL_FIT.heroVwSm : CATEGORY_REVEAL_FIT.heroVw;
    return Math.min(vw * frac, cap);
  }
  const cap = sm ? CATEGORY_REVEAL_FIT.soloCapSm : CATEGORY_REVEAL_FIT.soloCap;
  const frac = sm ? CATEGORY_REVEAL_FIT.soloVwSm : CATEGORY_REVEAL_FIT.soloVw;
  return Math.min(vw * frac, cap);
}

/**
 * Preferred mosaic/hero widths when they fit under the chapter header.
 * Short stages shrink covers only; chrome stays. Align start when compact
 * so tiles never center up into the sticky header.
 */
export function categoryRevealAwardFit(
  input: CategoryRevealAwardFitInput,
): CategoryRevealAwardFit {
  const availableH = Math.max(1, input.availableH);
  const usableH = Math.max(1, availableH - CATEGORY_REVEAL_FIT.bottomPad);
  const awardChromeH = Math.max(0, input.awardChromeH);
  const placeHeadH = Math.max(0, input.placeHeadH);
  const places = input.places;
  if (places.length === 0) {
    return { scale: 1, align: "center", widths: [] };
  }

  const preferredHeights = places.map((place) =>
    placeColumnH(place.preferredW, place, placeHeadH),
  );
  const preferredTotal = awardChromeH + Math.max(...preferredHeights);
  if (preferredTotal <= usableH + 0.5) {
    return {
      scale: 1,
      align: "center",
      widths: places.map((place) => place.preferredW),
    };
  }

  const mosaicBudget =
    usableH - awardChromeH - placeHeadH - CATEGORY_REVEAL_FIT.gridMt;
  const widths = places.map((place) => {
    const maxW = maxWidthForBudget(place, mosaicBudget);
    return clamp(Math.min(place.preferredW, maxW), place.floor, place.preferredW);
  });
  const minScale = Math.min(
    ...places.map((place, i) => widths[i]! / Math.max(1, place.preferredW)),
  );

  return {
    scale: minScale,
    align: "start",
    widths,
  };
}
