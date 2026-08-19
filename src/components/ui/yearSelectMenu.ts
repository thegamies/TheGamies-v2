export const YEAR_SELECT_MENU_MIN_PX = 120;
export const YEAR_SELECT_MENU_PAD_PX = 8;

export type YearSelectMenuEdge = "start" | "end";

/**
 * Hang the menu from the trigger edge that stays on-screen.
 * Prefer `end` (right in LTR) when both fit — the control is usually top-right.
 */
export function yearSelectMenuEdge({
  triggerLeft,
  triggerRight,
  menuWidth,
  viewportWidth,
  pad = YEAR_SELECT_MENU_PAD_PX,
}: {
  triggerLeft: number;
  triggerRight: number;
  menuWidth: number;
  viewportWidth: number;
  pad?: number;
}): YearSelectMenuEdge {
  const width = Math.max(menuWidth, 1);
  const startRight = triggerLeft + width;
  const endLeft = triggerRight - width;
  const startFits = startRight <= viewportWidth - pad;
  const endFits = endLeft >= pad;

  if (endFits && !startFits) return "end";
  if (startFits && !endFits) return "start";
  if (endFits && startFits) return "end";

  const overflowStart = Math.max(0, startRight - (viewportWidth - pad));
  const overflowEnd = Math.max(0, pad - endLeft);
  return overflowStart <= overflowEnd ? "start" : "end";
}
