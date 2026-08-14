"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { pickerTriggerClass } from "@/components/ui/controls";
import {
  TIME_LOOP_COPIES,
  firstTimeInRange,
  formatTimePickerLabel,
  isTimeInRange,
  loopSelectedTopOffset,
  parseIsoTime,
  toHour12,
  toHour24,
  toIsoTime,
  wrapLoopScrollTop,
} from "@/lib/ui/time-picker";

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const ITEM_HEIGHT = 32;
const COLUMN_HEIGHT = "h-[13.5rem]";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function InfiniteScrollColumn({
  "aria-label": ariaLabel,
  items,
  selectedIndex,
  isEnabled,
  format,
  onSelect,
}: {
  "aria-label": string;
  items: number[];
  selectedIndex: number;
  isEnabled: (value: number) => boolean;
  format: (value: number) => string;
  onSelect: (value: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapping = useRef(false);
  const looped = useMemo(
    () =>
      Array.from({ length: TIME_LOOP_COPIES }, (_, copy) =>
        items.map((value, index) => ({
          key: `${copy}-${value}`,
          copy,
          index,
          value,
        })),
      ).flat(),
    [items],
  );

  const initialIndex = useRef(selectedIndex);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.scrollTop = loopSelectedTopOffset(
      initialIndex.current,
      items.length,
      ITEM_HEIGHT,
    );
  }, [items.length]);

  function onScroll() {
    const root = rootRef.current;
    if (!root || wrapping.current) return;
    const cycle = items.length * ITEM_HEIGHT;
    const next = wrapLoopScrollTop(root.scrollTop, cycle);
    if (next === root.scrollTop) return;
    wrapping.current = true;
    root.scrollTop = next;
    wrapping.current = false;
  }

  return (
    <div
      ref={rootRef}
      role="listbox"
      aria-label={ariaLabel}
      onScroll={onScroll}
      className={`${COLUMN_HEIGHT} w-8 overflow-y-auto overscroll-contain scrollbar-none`}
    >
      {looped.map((entry) => {
        const selected = entry.index === selectedIndex;
        const enabled = isEnabled(entry.value);
        return (
          <button
            key={entry.key}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={!enabled}
            onClick={() => onSelect(entry.value)}
            className={`flex h-8 w-full shrink-0 items-center justify-center text-sm tabular-nums ${
              selected
                ? "bg-accent font-semibold text-white"
                : enabled
                  ? "text-ink hover:bg-paper"
                  : "text-muted opacity-30"
            }`}
          >
            {format(entry.value)}
          </button>
        );
      })}
    </div>
  );
}

export function TimePanel({
  hours,
  minutes,
  minTime,
  maxTime,
  onChange,
}: {
  hours: number;
  minutes: number;
  minTime?: string;
  maxTime?: string;
  onChange: (hours: number, minutes: number) => void;
}) {
  const { hour12, period } = toHour12(hours);

  function hourEnabled(nextHour12: number, nextPeriod: "am" | "pm"): boolean {
    return (
      firstTimeInRange(
        toHour24(nextHour12, nextPeriod),
        minTime,
        maxTime,
        minutes,
      ) != null
    );
  }

  function commit(nextHours: number, nextMinutes: number) {
    if (!isTimeInRange(nextHours, nextMinutes, minTime, maxTime)) return;
    onChange(nextHours, nextMinutes);
  }

  return (
    <div className="flex items-start gap-3">
      <InfiniteScrollColumn
        aria-label="Hour"
        items={HOURS_12}
        selectedIndex={HOURS_12.indexOf(hour12)}
        isEnabled={(h) => hourEnabled(h, period)}
        format={(h) => String(h)}
        onSelect={(h) => {
          const nextHours = toHour24(h, period);
          const nextMinutes =
            firstTimeInRange(nextHours, minTime, maxTime, minutes) ?? minutes;
          commit(nextHours, nextMinutes);
        }}
      />
      <InfiniteScrollColumn
        aria-label="Minute"
        items={MINUTES}
        selectedIndex={minutes}
        isEnabled={(m) => isTimeInRange(hours, m, minTime, maxTime)}
        format={pad2}
        onSelect={(m) => commit(hours, m)}
      />
      <div className="flex flex-col" role="listbox" aria-label="AM or PM">
        {(["am", "pm"] as const).map((nextPeriod) => {
          const enabled = hourEnabled(hour12, nextPeriod);
          const selected = period === nextPeriod;
          return (
            <button
              key={nextPeriod}
              type="button"
              role="option"
              aria-selected={selected}
              disabled={!enabled}
              onClick={() => {
                const nextHours = toHour24(hour12, nextPeriod);
                const nextMinutes =
                  firstTimeInRange(nextHours, minTime, maxTime, minutes) ??
                  minutes;
                commit(nextHours, nextMinutes);
              }}
              className={`flex h-8 items-center justify-center px-2 text-sm ${
                selected
                  ? "bg-accent font-semibold text-white"
                  : enabled
                    ? "text-ink hover:bg-paper"
                    : "text-muted opacity-30"
              }`}
            >
              {nextPeriod.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ClockMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      className={className}
    >
      <circle
        cx="8"
        cy="8.5"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M8 5.25v3.4l2.4 1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function TimePicker({
  id,
  name,
  value,
  min,
  max,
  disabled = false,
  required = false,
  placeholder = "Pick a time",
  className = "",
  "aria-label": ariaLabel,
  onChange,
}: {
  id?: string;
  name?: string;
  /** `HH:mm` or empty. */
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
  const panelId = `${triggerId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const parsed = parseIsoTime(value);
  const now = new Date();
  const hours = parsed?.hours ?? now.getHours();
  const minutes = parsed?.minutes ?? now.getMinutes();
  const label = parsed ? formatTimePickerLabel(hours, minutes) : placeholder;

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
        aria-controls={panelId}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={pickerTriggerClass}
      >
        <ClockMark className="shrink-0 text-accent" />
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
          aria-label="Choose a time"
          className="absolute z-30 mt-1 rounded-[var(--radius-control)] border border-line bg-panel p-3"
        >
          <TimePanel
            hours={hours}
            minutes={minutes}
            minTime={min}
            maxTime={max}
            onChange={(nextHours, nextMinutes) => {
              onChange(toIsoTime(nextHours, nextMinutes));
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
