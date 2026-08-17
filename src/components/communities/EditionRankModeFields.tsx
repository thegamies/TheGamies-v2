"use client";

import { RadioOption } from "@/components/ui/Radio";
import type { SharedRankMode } from "@/lib/standings/shared-rank";

export const EDITION_RANK_MODE_OPTIONS: Array<{
  id: SharedRankMode;
  label: string;
  hint: string;
}> = [
  {
    id: "dense",
    label: "Dense",
    hint: "Tied games share a place. The next place is the next number (1 · 1 · 2).",
  },
  {
    id: "competition",
    label: "Competition",
    hint: "Tied games share a place. The next place skips (1 · 1 · 3).",
  },
];

export function EditionRankModeFields({
  value,
  disabled,
  onChange,
}: {
  value: SharedRankMode;
  disabled?: boolean;
  onChange: (next: SharedRankMode) => void;
}) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="sr-only">Tie numbering</legend>
      {EDITION_RANK_MODE_OPTIONS.map((opt) => (
        <RadioOption
          key={opt.id}
          name="rankMode"
          value={opt.id}
          checked={value === opt.id}
          onChange={() => onChange(opt.id)}
          hint={opt.hint}
        >
          {opt.label}
        </RadioOption>
      ))}
    </fieldset>
  );
}
