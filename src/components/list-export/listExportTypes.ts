import type { ReactNode } from "react";
import type { ExportLayoutId } from "./exportDimensions";
import type { ExportRankChromeConfig } from "./rankChrome";
import { BRAND_ORANGE, EXPORT_BG } from "./exportConstants";

export { BRAND_ORANGE, EXPORT_BG };

/** A single ranked entry to render on the poster. */
export type ExportGame = {
  id: string;
  title: string;
  /** IGDB cover URL (stored as the t_cover_big variant); may be null. */
  imageUrl: string | null;
};

/** Same gradient stack as the cinema card title area. */
export const EXPORT_TITLE_GRADIENT =
  "linear-gradient(to top, #000000 0%, rgba(0,0,0,0.97) 22%, rgba(0,0,0,0.78) 48%, rgba(0,0,0,0.35) 78%, rgba(0,0,0,0.06) 94%, transparent 100%)";

/** IGDB-style cover proportions (e.g. cover_big 264×352). */
export const EXPORT_COVER_WIDTH = 264;
export const EXPORT_COVER_HEIGHT = 352;
export const EXPORT_COVER_ASPECT = EXPORT_COVER_WIDTH / EXPORT_COVER_HEIGHT;

export const EXPORT_GAME_COUNT_MAX = 100;

export function exportGameCountOptions(listLength: number): number[] {
  const max = Math.min(EXPORT_GAME_COUNT_MAX, listLength);
  return Array.from({ length: max }, (_, i) => i + 1);
}

export type ListExportListType = "goty" | "custom";

/**
 * Optional per-card render hook. Lets callers (e.g. the Remotion video export)
 * wrap each card to animate it. When omitted, cards render unchanged, so the
 * static image export is byte-for-byte identical.
 */
export type RenderExportCard = (args: {
  rank: number;
  card: ReactNode;
  /** Card cover width in px. */
  width: number;
  /** Total card height in px (cover + any rank banner). */
  height: number;
  /** Row index of this card in the grid (0 = top row). */
  row: number;
  /** Column index within its row (0 = left-most). */
  col: number;
  /** Number of cards in this card's row. */
  colsInRow: number;
  /** Total number of rows in the grid. */
  rowCount: number;
}) => ReactNode;

export interface ListExportPosterProps {
  games: ExportGame[];
  year: number;
  layout: ExportLayoutId;
  width: number;
  height: number;
  /** How many ranked games to include (1–10, capped by `games`). */
  gameCount: number;
  /** List heading for branded export headers. */
  title?: string;
  /** GOTY vs custom — drives default title / tracking when badges omit. */
  listType?: ListExportListType;
  /** Show the year square badge in the poster header. */
  showYearBadge?: boolean;
  /** Show the TOP N square badge in the poster header. */
  showTopCount?: boolean;
  /** Optional rank chrome override. Defaults to production banner-below. */
  rankChrome?: ExportRankChromeConfig;
  /** Optional per-card wrapper (used by the animated video export). */
  renderCard?: RenderExportCard;
  /**
   * Optional replacement for the CSS poster background. The video export passes
   * a pre-rasterized image here because the in-browser video renderer can't
   * draw radial/repeating gradients.
   */
  backgroundSlot?: ReactNode;
}
