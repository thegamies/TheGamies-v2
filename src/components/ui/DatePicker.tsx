"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { pickerTriggerClass } from "@/components/ui/controls";
import {
  addCalendarMonth,
  calendarMonthDays,
  formatDatePickerLabel,
  formatMonthLabel,
  isIsoDateInRange,
  parseIsoDate,
  todayIsoDate,
} from "@/lib/ui/calendar-month";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function CalendarMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      className={className}
    >
      <rect
        x="1.5"
        y="3"
        width="13"
        height="11.5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <rect x="1.5" y="3" width="13" height="3.25" rx="1" fill="currentColor" />
      <path
        d="M5 1.5v3M11 1.5v3"
        fill="none"
        stroke="var(--paper)"
        strokeWidth="1.35"
        strokeLinecap="square"
      />
      <path
        d="M4.5 9h1.25M7.4 9h1.25M10.25 9H11.5M4.5 11.5h1.25M7.4 11.5h1.25M10.25 11.5H11.5"
        stroke="var(--ink)"
        strokeWidth="1.15"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function CalendarPanel({
  value,
  min,
  max,
  anchorYear,
  onPick,
}: {
  value: string;
  min?: string;
  max?: string;
  /** When unset, open this calendar year (past event years). */
  anchorYear?: number;
  onPick: (iso: string) => void;
}) {
  const selected = parseIsoDate(value);
  const initialMonth = selected
    ? { year: selected.year, monthIndex: selected.monthIndex }
    : (() => {
        const today = parseIsoDate(todayIsoDate());
        if (anchorYear != null) {
          const monthIndex =
            today && today.year === anchorYear ? today.monthIndex : 10;
          return { year: anchorYear, monthIndex };
        }
        return today ?? { year: 2026, monthIndex: 0 };
      })();
  const [month, setMonth] = useState(initialMonth);

  useEffect(() => {
    if (selected) {
      setMonth({ year: selected.year, monthIndex: selected.monthIndex });
      return;
    }
    if (anchorYear == null) return;
    setMonth((current) => {
      if (current.year === anchorYear) return current;
      const today = parseIsoDate(todayIsoDate());
      const monthIndex =
        today && today.year === anchorYear ? today.monthIndex : 10;
      return { year: anchorYear, monthIndex };
    });
  }, [selected?.year, selected?.monthIndex, anchorYear]);

  const days = useMemo(
    () => calendarMonthDays(month.year, month.monthIndex),
    [month.year, month.monthIndex],
  );
  const today = todayIsoDate();

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center text-muted transition-colors duration-[var(--motion-fast)] hover:text-ink"
          aria-label="Previous month"
          onClick={() =>
            setMonth((current) =>
              addCalendarMonth(current.year, current.monthIndex, -1),
            )
          }
        >
          ‹
        </button>
        <p className="font-display text-xl tracking-wide text-ink">
          {formatMonthLabel(month.year, month.monthIndex)}
        </p>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center text-muted transition-colors duration-[var(--motion-fast)] hover:text-ink"
          aria-label="Next month"
          onClick={() =>
            setMonth((current) =>
              addCalendarMonth(current.year, current.monthIndex, 1),
            )
          }
        >
          ›
        </button>
      </div>

      <div
        className="mt-3 grid grid-cols-7 gap-px"
        role="grid"
        aria-label={formatMonthLabel(month.year, month.monthIndex)}
      >
        {WEEKDAYS.map((day, index) => (
          <span
            key={`${day}-${index}`}
            className="pb-1 text-center text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase"
          >
            {day}
          </span>
        ))}
        {days.map((day) => {
          const inRange = isIsoDateInRange(day.iso, min, max);
          const isSelected = day.iso === value;
          const isToday = day.iso === today;
          const enabled = inRange || isSelected;
          return (
            <button
              key={day.iso}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              disabled={!enabled}
              onClick={() => {
                if (!enabled) return;
                onPick(day.iso);
              }}
              className={`flex size-8 items-center justify-center justify-self-center text-sm transition-colors duration-[var(--motion-fast)] ${
                isSelected
                  ? "bg-accent font-semibold text-white"
                  : !inRange
                    ? "text-muted opacity-30"
                    : isToday
                      ? "border border-accent text-ink"
                      : day.inMonth
                        ? "text-ink hover:bg-paper"
                        : "text-muted hover:bg-paper"
              }`}
            >
              {day.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DatePicker({
  id,
  name,
  value,
  min,
  max,
  disabled = false,
  required = false,
  placeholder = "Pick a date",
  className = "",
  "aria-label": ariaLabel,
  onChange,
}: {
  id?: string;
  name?: string;
  value: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  onChange: (next: string) => void;
}) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const gridId = `${triggerId}-grid`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const label = value ? formatDatePickerLabel(value) : placeholder;

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
      {name ? <input type="hidden" name={name} value={value} /> : null}
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
          className={`min-w-0 flex-1 truncate ${value ? "text-ink" : "text-muted"}`}
        >
          {label}
        </span>
      </button>

      {open ? (
        <div
          id={gridId}
          role="dialog"
          aria-label="Choose a date"
          className="absolute z-30 mt-1 w-full min-w-[17.5rem] rounded-[var(--radius-control)] border border-line bg-panel p-3"
        >
          <CalendarPanel
            value={value}
            min={min}
            max={max}
            onPick={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
