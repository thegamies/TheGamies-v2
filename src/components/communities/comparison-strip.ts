import type { CSSProperties } from "react";

/**
 * You / Community / Hosts / each host stay one row.
 * On a wide screen, five columns fill the content width with no horizontal
 * scroll. A sixth column is what starts the scroll. Narrow screens keep the
 * fixed column size and scroll when the row is wider than the page.
 */
export const COMPARISON_STRIP_FIT = 5;

export function comparisonColumnCount(
  showYou: boolean,
  voiceCount: number,
): number {
  return (showYou ? 1 : 0) + 2 + voiceCount;
}

export function comparisonStripTableClass(columnCount: number): string {
  const cols = Math.max(1, columnCount);
  return cols <= COMPARISON_STRIP_FIT
    ? "comparison-strip comparison-strip--fit"
    : "comparison-strip";
}

export function comparisonStripTableStyle(
  columnCount: number,
): CSSProperties & { "--strip-cols": string } {
  return {
    "--strip-cols": String(Math.max(1, columnCount)),
  };
}
