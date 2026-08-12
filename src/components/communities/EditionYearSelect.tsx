"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  slug: string;
  year: number;
  years: number[];
};

/**
 * Compact year switcher for edition pages — sits beside the section heading.
 * Only renders when there are 2+ public years.
 */
export function EditionYearSelect({ slug, year, years }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

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

  if (years.length <= 1) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex items-baseline gap-1.5 font-display text-2xl tracking-wide text-ink hover:text-accent"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{year}</span>
        <span
          className={`text-sm text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Edition year"
          className="absolute right-0 z-20 mt-2 min-w-[7.5rem] border border-line bg-paper py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          {years.map((y) => {
            const active = y === year;
            return (
              <li key={y} role="option" aria-selected={active}>
                <Link
                  href={`/communities/${encodeURIComponent(slug)}/edition/${y}`}
                  className={`block px-3 py-2 text-sm tracking-wide ${
                    active
                      ? "text-accent"
                      : "text-ink hover:bg-[color-mix(in_oklab,var(--ink)_4%,transparent)]"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {y}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
