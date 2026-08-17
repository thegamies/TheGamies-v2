/** Category Reveal — #3→#2→#1 columns that push right smoothly. */

export type CategoryRevealDensityBand =
  | "solo"
  | "editorial"
  | "dense"
  | "sheet";

export type CategoryRevealSlotDensity = {
  band: CategoryRevealDensityBand;
  showTitles: boolean;
  showGameCount: boolean;
  stackRows: 1 | 2 | 3;
  gridClassName: string;
  /** Column track width — set inline in px so mobile can’t miss CSS. */
  gridColumnPx: number;
  /** Inline grid structure. */
  gridStyle?: {
    display: "grid";
    gridAutoFlow: "column";
    gridTemplateRows: string;
    gridAutoColumns: string;
    columnGap: string;
    rowGap: string;
    alignContent: "start";
    listStyle: "none";
    margin: number;
    padding: number;
  };
  hero: boolean;
};

/**
 * Row stack for a tied place:
 * - 1 game → single cover
 * - ≤4 → 2 tall (2×2 at four)
 * - ≥5 → 3 tall, then keep adding columns
 */
export function categoryRevealStackRows(gameCount: number): 1 | 2 | 3 {
  const n = Math.max(0, Math.floor(gameCount));
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  return 3;
}

/** Mosaic column track widths (px). Paint forces these literally (mobile ignores CSS vars). */
export const CATEGORY_REVEAL_COL_PX = {
  editorial: { base: 84, md: 104 },
  dense: { base: 76, md: 96 },
} as const;

export const CATEGORY_REVEAL_MD_MIN_PX = 768;

export function categoryRevealColPx(
  cell: "editorial" | "dense",
  viewportWidth: number,
): number {
  const sizes = CATEGORY_REVEAL_COL_PX[cell];
  return viewportWidth >= CATEGORY_REVEAL_MD_MIN_PX ? sizes.md : sizes.base;
}

export function categoryRevealGridCell(
  grid: Element,
): "editorial" | "dense" | null {
  if (grid.classList.contains("category-reveal-grid--editorial")) {
    return "editorial";
  }
  if (grid.classList.contains("category-reveal-grid--dense")) {
    return "dense";
  }
  return null;
}

/** Apply fixed mosaic track — literal px so mobile can’t size to intrinsic covers. */
export function applyCategoryRevealGridColumns(
  grid: HTMLElement,
  viewportWidth: number,
  maxColPx?: number,
): void {
  const cell = categoryRevealGridCell(grid);
  if (!cell) return;
  const preferred = categoryRevealColPx(cell, viewportWidth);
  const colPx =
    maxColPx == null
      ? preferred
      : Math.min(preferred, Math.max(1, maxColPx));
  grid.style.setProperty("display", "grid");
  grid.style.setProperty("grid-auto-flow", "column");
  grid.style.setProperty("grid-auto-columns", `${colPx}px`, "important");
  grid.style.setProperty("--category-reveal-col", `${colPx}px`);
  grid.style.setProperty("list-style", "none");
  grid.style.setProperty("margin", "0");
  grid.style.setProperty("padding", "0");
}

function scrollStackGrid(
  rows: 2 | 3,
  cell: "editorial" | "dense",
): Pick<
  CategoryRevealSlotDensity,
  "gridClassName" | "gridStyle" | "gridColumnPx"
> {
  const colPx = CATEGORY_REVEAL_COL_PX[cell].base;
  const gap = cell === "editorial" ? "8px" : "6px";
  // Default to mobile px; paint/layout swaps to md via applyCategoryRevealGridColumns.
  if (rows === 2 && cell === "editorial") {
    return {
      gridClassName: "category-reveal-grid category-reveal-grid--editorial",
      gridColumnPx: colPx,
      gridStyle: {
        display: "grid",
        gridAutoFlow: "column",
        gridTemplateRows: "auto auto",
        gridAutoColumns: `${colPx}px`,
        columnGap: gap,
        rowGap: gap,
        alignContent: "start",
        listStyle: "none",
        margin: 0,
        padding: 0,
      },
    };
  }
  return {
    gridClassName: "category-reveal-grid category-reveal-grid--dense",
    gridColumnPx: colPx,
    gridStyle: {
      display: "grid",
      gridAutoFlow: "column",
      gridTemplateRows: "auto auto auto",
      gridAutoColumns: `${colPx}px`,
      columnGap: gap,
      rowGap: gap,
      alignContent: "start",
      listStyle: "none",
      margin: 0,
      padding: 0,
    },
  };
}

export function categoryRevealSlotDensity(
  gameCount: number,
  opts: { rank?: number } = {},
): CategoryRevealSlotDensity {
  const n = Math.max(0, Math.floor(gameCount));
  const hero = opts.rank === 1 && n === 1;

  if (n <= 1) {
    return {
      band: "solo",
      showTitles: true,
      showGameCount: false,
      stackRows: 1,
      hero,
      gridColumnPx: 0,
      gridClassName: hero
        ? "grid grid-cols-1 gap-1.5 w-[min(36vw,11rem)] sm:w-[min(42vw,13.5rem)]"
        : "grid grid-cols-1 gap-1.5 w-[min(28vw,8.5rem)] sm:w-[min(30vw,10rem)]",
    };
  }

  if (n <= 4) {
    return {
      band: "editorial",
      showTitles: true,
      showGameCount: false,
      stackRows: 2,
      hero: false,
      ...scrollStackGrid(2, "editorial"),
    };
  }

  return {
    band: n > 6 ? "sheet" : "dense",
    showTitles: true,
    showGameCount: true,
    stackRows: 3,
    hero: false,
    ...scrollStackGrid(3, "dense"),
  };
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Title settles, then places move; last place keeps dwell before exit. */
export const CATEGORY_REVEAL_INTRO_AT = 0.12;
export const CATEGORY_REVEAL_EXIT_AT = 0.9;
export const CATEGORY_REVEAL_EXIT_DUR = 0.1;

/** Ceremony order among present places: #3 → #2 → #1. */
export function categoryRevealCeremonyOrder(
  presentPlaces: readonly number[],
): number[] {
  return [...new Set(presentPlaces)]
    .filter((p) => p === 1 || p === 2 || p === 3)
    .sort((a, b) => b - a);
}

/** Beat index among *present* places only (0 = first to enter). */
export function categoryRevealPlaceBeat(
  place: number,
  presentPlaces: readonly number[] = [3, 2, 1],
): number {
  const order = categoryRevealCeremonyOrder(presentPlaces);
  const idx = order.indexOf(place);
  return idx < 0 ? 0 : idx;
}

type PlaceMotionWindow = {
  start: number;
  openDur: number;
};

function placeMotionWindow(
  place: number,
  presentPlaces: readonly number[],
): PlaceMotionWindow | null {
  const order = categoryRevealCeremonyOrder(presentPlaces);
  const beat = order.indexOf(place);
  if (beat < 0) return null;

  const n = order.length;
  // Hold the final board (usually #1) before exit; each place gets its own beat.
  const dwellTail = n <= 1 ? 0.38 : n === 2 ? 0.28 : 0.22;
  const motionSpan = Math.max(
    0.24,
    CATEGORY_REVEAL_EXIT_AT - CATEGORY_REVEAL_INTRO_AT - dwellTail,
  );
  // Gap after a place’s label+grid before the next rank starts.
  const gap = n <= 1 ? 0 : 0.085;
  const openDur =
    n <= 1
      ? Math.min(0.42, motionSpan * 0.72)
      : (motionSpan - gap * (n - 1)) / n;

  return {
    start: CATEGORY_REVEAL_INTRO_AT + beat * (openDur + gap),
    openDur,
  };
}

/** Column open 0→1 — seats the place with # / Tied first (pack/push). */
export function categoryRevealPlaceOpen(
  t: number,
  place: number,
  presentPlaces: readonly number[] = [3, 2, 1],
): number {
  const win = placeMotionWindow(place, presentPlaces);
  if (!win) return 0;
  // Finish early so the column can rest before covers arrive.
  return easeInOut(
    clamp01((t - win.start) / Math.max(0.1, win.openDur * 0.46)),
  );
}

/**
 * Rank number + Tied — same seating beat as the column slide.
 * Covers stay hidden until this settles.
 */
export function categoryRevealPlaceLabelEnter(
  t: number,
  place: number,
  presentPlaces: readonly number[] = [3, 2, 1],
): number {
  return categoryRevealPlaceOpen(t, place, presentPlaces);
}

/** Game grid — only after # / Tied have seated; full left-to-right slide. */
export function categoryRevealPlaceGridEnter(
  t: number,
  place: number,
  presentPlaces: readonly number[] = [3, 2, 1],
): number {
  const win = placeMotionWindow(place, presentPlaces);
  if (!win) return 0;
  const start = win.start + win.openDur * 0.5;
  const dur = Math.max(0.16, win.openDur * 0.5);
  return easeInOut(clamp01((t - start) / dur));
}

/** How far the grid travels from off-screen left (px), given stage width. */
export function categoryRevealGridOffscreenLead(stageWidth: number): number {
  return Math.max(1, stageWidth * 1.15);
}

/** @deprecated Use categoryRevealPlaceLabelEnter — kept as an alias. */
export function categoryRevealPlaceNumberEnter(
  t: number,
  place: number,
  presentPlaces: readonly number[] = [3, 2, 1],
): number {
  return categoryRevealPlaceLabelEnter(t, place, presentPlaces);
}

export type CategoryRevealPlaceLayout = {
  place: number;
  left: number;
  width: number;
};

export type CategoryRevealPlaceOpens = {
  1: number;
  2: number;
  3: number;
};

/** Open amounts for scrub time `t` (missing places stay 0). */
export function categoryRevealPlaceOpens(
  t: number,
  layouts: readonly CategoryRevealPlaceLayout[],
  reduced = false,
): CategoryRevealPlaceOpens {
  const present = layouts.map((row) => row.place);
  const has = new Set(present);
  if (reduced) {
    return {
      1: has.has(1) ? 1 : 0,
      2: has.has(2) ? 1 : 0,
      3: has.has(3) ? 1 : 0,
    };
  }
  return {
    1: has.has(1) ? categoryRevealPlaceOpen(t, 1, present) : 0,
    2: has.has(2) ? categoryRevealPlaceOpen(t, 2, present) : 0,
    3: has.has(3) ? categoryRevealPlaceOpen(t, 3, present) : 0,
  };
}

/**
 * translate3d X so each column starts fully off-screen left, slides in,
 * and packs from stage-left (#3 first, then #2 / #1 insert left and push right).
 * Natural flex layout stays #1·#2·#3; motion is transform-only.
 * `gapPx` must match the board’s flex gap so ranks never sit flush.
 */
export function categoryRevealPlaceTranslateX(
  place: number,
  layouts: readonly CategoryRevealPlaceLayout[],
  opens: CategoryRevealPlaceOpens,
  offscreenLead: number,
  gapPx = 0,
): number {
  const byPlace = new Map(
    layouts.map((row) => [row.place, row] as const),
  );
  const self = byPlace.get(place);
  if (!self) return 0;

  const open =
    place === 1 ? opens[1] : place === 2 ? opens[2] : place === 3 ? opens[3] : 0;

  let packedLeft = 0;
  let gapsBefore = 0;
  for (const prior of [1, 2, 3] as const) {
    if (prior === place) break;
    const row = byPlace.get(prior);
    const priorOpen = opens[prior];
    if (!row || priorOpen <= 0.001) continue;
    packedLeft += row.width * priorOpen;
    gapsBefore += 1;
  }
  packedLeft += Math.max(0, gapPx) * gapsBefore;

  const lead = Math.max(offscreenLead, self.width);
  const enter = (1 - open) * lead;
  return packedLeft - enter - self.left;
}

/** Scroll units for one award — scales with how many podium places it has. */
export function categoryRevealAwardScrollUnits(placeCount: number): number {
  const n = Math.max(1, Math.min(3, Math.floor(placeCount)));
  // Extra scroll for full podiums so each rank can finish, then linger on #1.
  return n === 1 ? 0.88 : n === 2 ? 1.35 : 1.9;
}

/**
 * Local award t from chapter progress, weighted by each award’s scroll units
 * so one-place awards don’t burn the same scroll as a full podium.
 */
export function categoryRevealAwardLocalT(
  p: number,
  index: number,
  units: readonly number[],
): number {
  const n = units.length;
  if (n === 0) return p;
  const overlap = 0.12;
  const total = units.reduce((a, b) => a + b, 0);
  const span = Math.max(0.001, total - overlap * Math.max(0, n - 1));
  let start = 0;
  for (let i = 0; i < index; i += 1) start += units[i]! - overlap;
  return (p * span - start) / Math.max(0.001, units[index]!);
}
