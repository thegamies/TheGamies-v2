"use client";

import { useEffect, useId, useRef, useState } from "react";
import { pickerTriggerClass } from "@/components/ui/controls";

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  name?: string;
  value: string;
  options: readonly SelectOption[];
  disabled?: boolean;
  className?: string;
  /** Accessible name when the visible label is not associated via htmlFor. */
  "aria-label"?: string;
  onChange: (next: string) => void;
};

/**
 * Pop-open list select — same trigger language as YearPicker / DatePicker.
 * Hidden input when `name` is set (empty values are omitted from GET forms).
 */
export function Select({
  id,
  name,
  value,
  options,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
  onChange,
}: Props) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listId = `${triggerId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value);
  const label = selected?.label ?? options[0]?.label ?? "";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && value !== "" ? (
        <input type="hidden" name={name} value={value} />
      ) : null}
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={pickerTriggerClass}
      >
        <span className="min-w-0 flex-1 truncate text-ink">{label}</span>
        <span
          className={`shrink-0 text-xs text-muted transition-transform duration-[var(--motion-fast)] ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1 max-h-72 min-w-full overflow-y-auto rounded-[var(--radius-control)] border border-line bg-panel py-1"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm tracking-wide ${
                    active
                      ? "text-accent"
                      : "text-ink hover:bg-[color-mix(in_oklab,var(--ink)_4%,transparent)]"
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
