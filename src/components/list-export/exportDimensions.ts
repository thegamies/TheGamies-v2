export type ExportLayoutId = "podium-awards-4-5-2";

export interface ExportLayoutMeta {
  id: ExportLayoutId;
  label: string;
  shortLabel: string;
  sizeLabel: string;
}

/** Active layouts for the export dialog. Tabs stay hidden while this has a single entry. */
export const EXPORT_LAYOUTS: ExportLayoutMeta[] = [
  {
    id: "podium-awards-4-5-2",
    label: "Awards",
    shortLabel: "Awards",
    sizeLabel: "1080×1350",
  },
];

export const EXPORT_LAYOUT_DEFAULT: ExportLayoutId = "podium-awards-4-5-2";

export function getExportDimensions(layout: ExportLayoutId): {
  width: number;
  height: number;
} {
  void layout;
  return { width: 1080, height: 1350 };
}
