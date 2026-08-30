/** Rank chrome options for list-export Awards cards. Production uses `banner-below`. */

export type ExportRankMode =
  | "frame-digit"
  | "digit-only"
  | "frame-only"
  | "banner"
  | "banner-below"
  | "corner-badge"
  | "corner-chip"
  | "none";

export type ExportRankPlacement =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export type ExportRankFormat = "number" | "hash" | "ordinal";

export type ExportRankChromeConfig = {
  mode: ExportRankMode;
  placement: ExportRankPlacement;
  format: ExportRankFormat;
  /** Under-cover banner only. Blurred cover fill behind chrome. */
  blurredBackdrop: boolean;
  /** Blur radius in px when `blurredBackdrop` is on. */
  blurredBackdropBlur: number;
  /** Soft fade (0–20%) at cover top/bottom edges when blur is on. */
  blurredBackdropFade: number;
  /** Banner modes. Use brand fill behind the rank label. */
  bannerBrandBg: boolean;
  /** Banner background opacity, 0–100. */
  bannerBgAlpha: number;
  /** Banner rank text size as % of the default (50–160). */
  bannerTextScale: number;
  /** Soft gray inset ring for a framed / raised edge. */
  innerBorder: boolean;
  /** Inner border opacity, 0–100. */
  innerBorderAlpha: number;
  /** Inner border thickness in ref-px (scaled to card width), 1–8. */
  innerBorderWidth: number;
  /** Light top-left / dark bottom-right inset for a bevelled lip. */
  edgeBevel: boolean;
  /** Soft drop shadow under the card. */
  outerLift: boolean;
};

/** Current production Awards card look. */
export const PRODUCTION_EXPORT_RANK_CHROME: ExportRankChromeConfig = {
  mode: "banner-below",
  placement: "bottom-left",
  format: "ordinal",
  blurredBackdrop: true,
  blurredBackdropBlur: 12,
  blurredBackdropFade: 0,
  bannerBrandBg: true,
  bannerBgAlpha: 55,
  bannerTextScale: 115,
  innerBorder: true,
  innerBorderAlpha: 40,
  innerBorderWidth: 2,
  edgeBevel: false,
  outerLift: true,
};

/** Same look as production, but with no rank banner/label (covers only). */
export const NO_RANK_EXPORT_CHROME: ExportRankChromeConfig = {
  ...PRODUCTION_EXPORT_RANK_CHROME,
  mode: "none",
};

/**
 * Rank shown as a small translucent chip overlaid on the bottom-left of the
 * cover. `bannerBgAlpha` is the chip fill opacity and `blurredBackdropBlur` is
 * the chip's backdrop blur — both tuned so the art shows through behind it.
 */
export const CORNER_CHIP_EXPORT_CHROME: ExportRankChromeConfig = {
  ...PRODUCTION_EXPORT_RANK_CHROME,
  mode: "corner-chip",
  placement: "bottom-left",
  bannerBrandBg: false,
  bannerBgAlpha: 42,
  blurredBackdropBlur: 8,
};

/** User-facing ranking display styles for the poster/export cards. */
export type ExportRankStyle = "banner" | "chip" | "off";

export const EXPORT_RANK_STYLES: { id: ExportRankStyle; label: string }[] = [
  { id: "banner", label: "Banner" },
  { id: "chip", label: "Chip" },
  { id: "off", label: "Off" },
];

/**
 * Resolve a user-facing ranking style to its chrome config. Pass `format` to
 * override the rank label format (e.g. `"number"` to drop the ordinal suffix).
 */
export function rankChromeForStyle(
  style: ExportRankStyle,
  format?: ExportRankFormat,
): ExportRankChromeConfig {
  const base =
    style === "off"
      ? NO_RANK_EXPORT_CHROME
      : style === "chip"
        ? CORNER_CHIP_EXPORT_CHROME
        : PRODUCTION_EXPORT_RANK_CHROME;
  return format && format !== base.format ? { ...base, format } : base;
}

export function formatExportRank(rank: number, format: ExportRankFormat): string {
  if (format === "hash") return `#${rank}`;
  if (format === "ordinal") {
    const v = rank % 100;
    const suffix =
      v >= 11 && v <= 13
        ? "th"
        : rank % 10 === 1
          ? "st"
          : rank % 10 === 2
            ? "nd"
            : rank % 10 === 3
              ? "rd"
              : "th";
    return `${rank}${suffix}`;
  }
  return String(rank);
}
