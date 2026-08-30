"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  YEAR_SELECT_MENU_MIN_PX,
  yearSelectMenuEdge,
  type YearSelectMenuEdge,
} from "@/components/ui/yearSelectMenu";

export type YearSelectOption = {
  href: string;
  year?: number;
  label?: string;
};

type Props = {
  year?: number;
  /** Precomputed year links — serializable for Server → Client boundaries. */
  options: YearSelectOption[];
  /** Show the year even when there is only one (no menu). */
  alwaysShow?: boolean;
  /** Accessible name for the control / listbox. */
  label?: string;
  /** Text trigger copy (e.g. All) instead of the current year. */
  triggerLabel?: string;
};

const yearTriggerClass =
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-display text-2xl leading-none tracking-wide text-ink hover:text-accent";

/**
 * Compact pop-open year switcher — sits to the right of a section heading.
 * Shared by live standings and edition results (via EditionYearSelect).
 * Pass `options` (year + href) rather than a function so Server Components
 * can render this Client Component without RSC serialization errors.
 */
export function YearSelect({
  year,
  options,
  alwaysShow = false,
  label = "Year",
  triggerLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [menuEdge, setMenuEdge] = useState<YearSelectMenuEdge>("end");
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const root = rootRef.current;
      if (!root) return;
      const trigger = root.getBoundingClientRect();
      const menuWidth =
        listRef.current?.getBoundingClientRect().width || YEAR_SELECT_MENU_MIN_PX;
      setMenuEdge(
        yearSelectMenuEdge({
          triggerLeft: trigger.left,
          triggerRight: trigger.right,
          menuWidth,
          viewportWidth: window.innerWidth,
        }),
      );
    }

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | PointerEvent) {
      const el = rootRef.current;
      if (!el || el.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (options.length === 0) return null;
  if (options.length === 1 && !alwaysShow && !triggerLabel) return null;

  if (options.length === 1 && !triggerLabel) {
    return (
      <p
        className="font-display text-2xl leading-none tracking-wide text-ink"
        aria-label={label}
      >
        {year}
      </p>
    );
  }

  return (
    <div ref={rootRef} className="relative shrink-0 leading-none">
      <button
        type="button"
        className={yearTriggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{triggerLabel ?? year}</span>
        <span
          className={`text-sm leading-none text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          data-menu-edge={menuEdge}
          className={`absolute z-20 mt-2 min-w-[7.5rem] border border-line bg-paper py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${
            menuEdge === "start" ? "left-0" : "right-0"
          }`}
        >
          {options.map((opt) => {
            const text = opt.label ?? (opt.year != null ? String(opt.year) : opt.href);
            const active = opt.year != null ? opt.year === year : year == null;
            return (
              <li key={opt.href} role="option" aria-selected={active}>
                <Link
                  href={opt.href}
                  className={`block px-3 py-2 text-sm tracking-wide ${
                    active
                      ? "text-accent"
                      : "text-ink hover:bg-[color-mix(in_oklab,var(--ink)_4%,transparent)]"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {text}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
