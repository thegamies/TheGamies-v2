"use client";

import {
  controlGroupBarClass,
  controlGroupClass,
  controlLabelClass,
  segmentBtnClass,
} from "@/components/ui/controls";
import type { ListFormat } from "@/lib/lists/schema";

export const LIST_FORMAT_OPTIONS: { id: ListFormat; label: string }[] = [
  { id: "poster", label: "Poster" },
  { id: "list", label: "List" },
  { id: "grid", label: "Grid" },
];

export function ListFormatControl({
  value,
  onChange,
  labeled = false,
}: {
  value: ListFormat;
  onChange: (next: ListFormat) => void;
  /** Editor chrome: “Format” label above the segments. */
  labeled?: boolean;
}) {
  const group = (
    <div
      role="group"
      aria-label="List format"
      className={labeled ? controlGroupClass : `${controlGroupBarClass} w-fit shrink-0`}
    >
      {LIST_FORMAT_OPTIONS.map((format) => (
        <button
          key={format.id}
          type="button"
          onClick={() => onChange(format.id)}
          aria-pressed={value === format.id}
          className={segmentBtnClass(value === format.id)}
        >
          {format.label}
        </button>
      ))}
    </div>
  );

  if (!labeled) return group;

  return (
    <div className={controlLabelClass}>
      Format
      {group}
    </div>
  );
}
