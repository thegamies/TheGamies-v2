"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarMark, CalendarPanel } from "@/components/ui/DatePicker";
import { TimePanel } from "@/components/ui/TimePicker";
import { pickerTriggerClass } from "@/components/ui/controls";
import { todayIsoDate } from "@/lib/ui/calendar-month";
import {
  datePart,
  formatDateTimePickerLabel,
  isIsoDateTimeInRange,
  parseIsoDateTime,
  timePart,
  toIsoDateTime,
} from "@/lib/ui/time-picker";

export function DateTimePicker({
  id,
  name,
  value,
  min,
  max,
  disabled = false,
  required = false,
  placeholder = "Pick a date and time",
  className = "",
  anchorYear,
  "aria-label": ariaLabel,
  onChange,
}: {
  id?: string;
  name?: string;
  /** `YYYY-MM-DDTHH:mm` or empty. */
  value: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  /** When empty, open the calendar on this year so past dates are in reach. */
  anchorYear?: number;
  "aria-label"?: string;
  onChange: (next: string) => void;
}) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const panelId = `${triggerId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const parsed = parseIsoDateTime(value);
  const date = parsed?.date ?? "";
  const now = new Date();
  const hours = parsed?.hours ?? now.getHours();
  const minutes = parsed?.minutes ?? now.getMinutes();
  const dateMin = min ? datePart(min) : undefined;
  const dateMax = max ? datePart(max) : undefined;
  const selectedDate = date || todayIsoDate();
  const minTime =
    min && datePart(min) === selectedDate ? timePart(min) : undefined;
  const maxTime =
    max && datePart(max) === selectedDate ? timePart(max) : undefined;
  const label = parsed ? formatDateTimePickerLabel(value) : placeholder;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
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

  function emit(next: string) {
    let clamped = next;
    if (min && clamped < min && datePart(clamped) === datePart(min)) {
      clamped = min;
    }
    if (max && clamped > max && datePart(clamped) === datePart(max)) {
      clamped = max;
    }
    if (!isIsoDateTimeInRange(clamped, min, max)) return;
    onChange(clamped);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
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
          className={`min-w-0 flex-1 truncate ${parsed ? "text-ink" : "text-muted"}`}
        >
          {label}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose a date and time"
          className="absolute z-30 mt-1 flex rounded-[var(--radius-control)] border border-line bg-panel"
        >
          <div className="p-3">
            <CalendarPanel
              value={date}
              min={dateMin}
              max={dateMax}
              anchorYear={anchorYear}
              onPick={(nextDate) => {
                emit(toIsoDateTime(nextDate, hours, minutes));
              }}
            />
          </div>
          <div className="shrink-0 border-l border-line p-3">
            <p className="mb-2 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Time
            </p>
            <TimePanel
              hours={hours}
              minutes={minutes}
              minTime={minTime}
              maxTime={maxTime}
              onChange={(nextHours, nextMinutes) => {
                emit(
                  toIsoDateTime(
                    date || todayIsoDate(),
                    nextHours,
                    nextMinutes,
                  ),
                );
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
