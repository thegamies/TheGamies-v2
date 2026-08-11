import type { ExportGame } from "./listExportTypes";
import { EXPORT_COVER_ASPECT } from "./listExportTypes";

export const AWARDS_GRID_GAP = 12;
export const AWARDS_SIDE_PAD = 32;
/** Y position of the glow line — midpoint between header text and game grid. */
export const AWARDS_HEADER_LINE_Y = 132;
/** Total header band height (title/brand stack). */
export const AWARDS_HEADER_BAND_PX = 128;
/** Gap between header band and first row of cards. */
export const AWARDS_GRID_TOP_PAD = 8;
/** Preferred poster title size (shrinks down to brand size, then truncates). */
export const AWARDS_TITLE_SIZE = 50;
/** Brand line size (also title shrink floor). */
export const AWARDS_BRAND_SIZE = 30;
/** Gap between title and brand line. */
export const AWARDS_TITLE_LINE_GAP = 10;

/** Podium rows 1–2 are laid out on a fixed three-card band; row 3 fits four cards in that band. */
const REFERENCE_ROW_SLOTS = 3;

export type CardSize = { w: number; h: number };

export interface AwardsRowLayout {
  games: ExportGame[];
  ranks: number[];
  /** Column count for band width and card sizing in this row. */
  slots: number;
}

function rowBandWidth(cardW: number, gap: number, slots = REFERENCE_ROW_SLOTS): number {
  return slots * cardW + (slots - 1) * gap;
}

/** Top 3: podium (1 + 2). Top 4: 2×2. Top 7: 3 + 4. Otherwise 3 / 3 / up-to-4 rows. */
export function buildAwardsRows(games: ExportGame[]): AwardsRowLayout[] {
  const n = games.length;
  if (n <= 0) return [];

  if (n === 3) {
    return [
      { games: games.slice(0, 1), ranks: [1], slots: 2 },
      { games: games.slice(1, 3), ranks: [2, 3], slots: 2 },
    ];
  }

  if (n === 4) {
    return [
      { games: games.slice(0, 2), ranks: [1, 2], slots: 2 },
      { games: games.slice(2, 4), ranks: [3, 4], slots: 2 },
    ];
  }

  if (n <= 3) {
    return [
      {
        games: games.slice(0, n),
        ranks: Array.from({ length: n }, (_, i) => i + 1),
        slots: n,
      },
    ];
  }

  if (n <= 6) {
    const row1 = games.slice(0, 3);
    const row2 = games.slice(3, n);
    return [
      { games: row1, ranks: [1, 2, 3], slots: 3 },
      { games: row2, ranks: row2.map((_, i) => i + 4), slots: 3 },
    ];
  }

  if (n === 7) {
    return [
      { games: games.slice(0, 3), ranks: [1, 2, 3], slots: 3 },
      { games: games.slice(3, 7), ranks: [4, 5, 6, 7], slots: 4 },
    ];
  }

  if (n <= 10) {
    const row1 = games.slice(0, 3);
    const row2 = games.slice(3, 6);
    const row3 = games.slice(6, n);
    return [
      { games: row1, ranks: [1, 2, 3], slots: 3 },
      { games: row2, ranks: [4, 5, 6], slots: 3 },
      { games: row3, ranks: row3.map((_, i) => i + 7), slots: row3.length === 4 ? 4 : 3 },
    ];
  }

  // n > 10: bottom-heavy pyramid instead of one ever-widening bottom row. Rows
  // grow toward the bottom — top rows hold fewer cards (so they stay the bigger
  // cards) and the extra cards from an uneven split land on the bottom rows.
  return distributeRows(games);
}

function distributeRows(games: ExportGame[]): AwardsRowLayout[] {
  const n = games.length;
  // Near-square grid: the row count is floor(sqrt(n)), so as the list grows the
  // rows widen before a new row is added (e.g. 30→5 rows of 6, 31→6/6/6/6/7,
  // 40→6 rows, 50→7 rows). Keep at least 3 rows for continuity with the podium.
  const rowCount = Math.max(3, Math.floor(Math.sqrt(n)));
  const base = Math.floor(n / rowCount);
  const remainder = n % rowCount;

  const rows: AwardsRowLayout[] = [];
  let index = 0;
  for (let i = 0; i < rowCount; i += 1) {
    // Bottom `remainder` rows get the extra card, so rows are non-decreasing.
    const size = base + (i >= rowCount - remainder ? 1 : 0);
    const slice = games.slice(index, index + size);
    rows.push({
      games: slice,
      ranks: slice.map((_, i2) => index + i2 + 1),
      slots: size,
    });
    index += size;
  }
  return rows;
}

/** Size cards for the awards content box; only scale up to fill height on 3-row layouts. */
export function awardsSizesForLayout(
  contentW: number,
  contentH: number,
  rows: AwardsRowLayout[],
  gap: number,
  /** Extra height below each cover (e.g. under-cover rank banner). */
  extraBelowCover?: (cardWidth: number) => number,
): { cardByRow: CardSize[]; rowBandW: number } {
  const rowCount = rows.length;
  const maxStackH = contentH - Math.max(0, rowCount - 1) * gap;
  const referenceSlots = 3;
  const scaleUpToFillHeight = rowCount >= 3;
  const below = (w: number) => Math.max(0, extraBelowCover?.(w) ?? 0);

  let wRef = (contentW - gap * (referenceSlots - 1)) / referenceSlots;
  let hRef = wRef / EXPORT_COVER_ASPECT;

  const bandW = () => rowBandWidth(wRef, gap, referenceSlots);

  let cardByRow = rows.map((row) => {
    if (row.slots === referenceSlots) {
      return { w: wRef, h: hRef };
    }
    const w = (bandW() - gap * (row.slots - 1)) / row.slots;
    return { w, h: w / EXPORT_COVER_ASPECT };
  });

  let stackH = cardByRow.reduce((sum, card) => sum + card.h + below(card.w), 0);
  if (stackH > maxStackH && stackH > 0) {
    const scale = maxStackH / stackH;
    wRef *= scale;
    hRef *= scale;
    cardByRow = rows.map((row) => {
      if (row.slots === referenceSlots) {
        return { w: wRef, h: hRef };
      }
      const w = (bandW() - gap * (row.slots - 1)) / row.slots;
      return { w, h: w / EXPORT_COVER_ASPECT };
    });
    stackH = cardByRow.reduce((sum, card) => sum + card.h + below(card.w), 0);
  }

  if (scaleUpToFillHeight && stackH > 0 && stackH < maxStackH) {
    const rowBandW = bandW();
    const scale = Math.min(maxStackH / stackH, contentW / rowBandW);
    if (scale > 1.001) {
      wRef *= scale;
      hRef *= scale;
      cardByRow = rows.map((row) => {
        if (row.slots === referenceSlots) {
          return { w: wRef, h: hRef };
        }
        const w = (rowBandWidth(wRef, gap, referenceSlots) - gap * (row.slots - 1)) / row.slots;
        return { w, h: w / EXPORT_COVER_ASPECT };
      });
    }
  }

  const rowBandW = rowBandWidth(wRef, gap, referenceSlots);
  return {
    cardByRow: cardByRow.map((card) => ({ w: Math.floor(card.w), h: Math.floor(card.h) })),
    rowBandW: Math.min(Math.floor(rowBandW), Math.floor(contentW)),
  };
}
