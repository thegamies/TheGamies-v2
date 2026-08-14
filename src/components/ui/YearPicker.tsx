"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarMark } from "@/components/ui/DatePicker";
import { pickerTriggerClass } from "@/components/ui/controls";
import {
  addYearGrid,
  isYearInRange,
  YEAR_PICKER_MAX,
  YEAR_PICKER_MIN,
  yearGridStart,
  yearGridYears,
} from "@/lib/ui/calendar-year";

export function YearPanel({
  value,
  min = YEAR_PICKER_MIN,
  max = YEAR_PICKER_MAX,
  disabledYears = [],
  onPick,
}: {
  value: number;
  min?: number;
  max?: number;
  disabledYears?: number[];
  onPick: (year: number) => void;
}) {
  const [start, setStart] = useState(() => yearGridStart(value));
  const [seenValue, setSeenValue] = useState(value);
  if (seenValue !== value) {
    setSeenValue(value);
    setStart(yearGridStart(value));
  }
  const blocked = useMemo(() => new Set(disabledYears), [disabledYears]);

  const years = yearGridYears(start);
  const currentYear = new Date().getFullYear();
  const end = start + years.length - 1;
  const canPrev = start > min;
  const canNext = end < max;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center text-muted transition-colors duration-[var(--motion-fast)] hover:text-ink disabled:opacity-30"
          aria-label="Previous years"
          disabled={!canPrev}
          onClick={() => setStart((current) => addYearGrid(current, -1))}
        >
          ‹
        </button>
        <p className="font-display text-xl tracking-wide text-ink">
          {start} – {end}
        </p>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center text-muted transition-colors duration-[var(--motion-fast)] hover:text-ink disabled:opacity-30"
          aria-label="Next years"
          disabled={!canNext}
          onClick={() => setStart((current) => addYearGrid(current, 1))}
        >
          ›
        </button>
      </div>

      <div
        className="mt-3 grid grid-cols-4 gap-px"
        role="grid"
        aria-label={`Years ${start} to ${end}`}
      >
        {years.map((year) => {
          const inRange = isYearInRange(year, min, max);
          const taken = blocked.has(year);
          const isSelected = year === value;
          const isCurrent = year === currentYear;
          const enabled = (inRange && !taken) || isSelected;
          return (
            <button
              key={year}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              disabled={!enabled}
              onClick={() => {
                if (!enabled) return;
                onPick(year);
              }}
              className={`flex h-8 items-center justify-center text-sm tabular-nums transition-colors duration-[var(--motion-fast)] ${
                isSelected
                  ? "bg-accent font-semibold text-white"
                  : !enabled
                    ? "text-muted opacity-30"
                    : isCurrent
                      ? "border border-accent text-ink"
                      : "text-ink hover:bg-paper"
              }`}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function YearPicker({
  id,
  name,
  value,
  min = YEAR_PICKER_MIN,
  max = YEAR_PICKER_MAX,
  disabledYears,
  disabled = false,
  required = false,
  placeholder = "Pick a year",
  className = "",
  "aria-label": ariaLabel,
  onChange,
}: {
  id?: string;
  name?: string;
  value: number | "";
  min?: number;
  max?: number;
  disabledYears?: number[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  onChange: (next: number) => void;
}) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const gridId = `${triggerId}-grid`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = typeof value === "number" ? value : null;
  const label = selected != null ? String(selected) : placeholder;
  const panelYear = selected ?? new Date().getFullYear();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.stopImmediatePropagation();
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name ? (
        <input type="hidden" name={name} value={selected ?? ""} />
      ) : null}
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={gridId}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={pickerTriggerClass}
      >
        <CalendarMark className="shrink-0 text-accent" />
        <span
          className={`min-w-0 flex-1 truncate ${selected != null ? "text-ink" : "text-muted"}`}
        >
          {label}
        </span>
      </button>

      {open ? (
        <div
          id={gridId}
          role="dialog"
          aria-label="Choose a year"
          className="absolute z-30 mt-1 w-full min-w-[17.5rem] rounded-[var(--radius-control)] border border-line bg-panel p-3"
        >
          <YearPanel
            value={panelYear}
            min={min}
            max={max}
            disabledYears={disabledYears}
            onPick={(year) => {
              onChange(year);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
