"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  searchGamesForList,
  type GameSearchHit,
} from "@/app/create/search-actions";
import type { AwardCategoryEligibility } from "@/lib/live-aggregate/award-category-defs";
import { fieldInputClass } from "@/components/ui/controls";
import { GameCover } from "@/components/ui/GameCover";

/**
 * Game search whose results overlay following content (do not push layout).
 * The open field raises its stacking context so the menu sits above siblings.
 */
export function GameSearchField({
  year,
  onSelect,
  placeholder,
  "aria-label": ariaLabel,
  isFull = false,
  fullMessage,
  excludeIds,
  eligibility,
  allowEditions = false,
}: {
  year: number;
  onSelect: (hit: GameSearchHit) => void;
  placeholder?: string;
  "aria-label": string;
  isFull?: boolean;
  fullMessage?: string;
  excludeIds?: ReadonlySet<string>;
  eligibility?: AwardCategoryEligibility;
  allowEditions?: boolean;
}) {
  const searchId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GameSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startSearch] = useTransition();

  const excluded = excludeIds ?? EMPTY_IDS;
  const visibleHits = hits.filter((hit) => !excluded.has(hit.id));
  const showOverlay = open && query.trim().length >= 2;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function setSearchQuery(next: string) {
    setQuery(next);
    if (next.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    if (isFull) {
      setHits([]);
      return;
    }
    const q = next.trim();
    startSearch(async () => {
      const results = await searchGamesForList({
        q,
        year,
        gotyMode: true,
        eligibility,
        allowEditions,
      });
      setHits(results);
    });
  }

  function select(hit: GameSearchHit) {
    onSelect(hit);
    setQuery("");
    setHits([]);
    setOpen(false);
  }

  return (
    <div
      ref={wrapRef}
      className={`relative ${showOverlay ? "z-50" : "z-10"}`}
    >
      <input
        id={searchId}
        className={`${fieldInputClass} mt-0`}
        value={query}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true);
        }}
        placeholder={placeholder ?? `Search ${year} games`}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-expanded={showOverlay}
        aria-controls={`${searchId}-results`}
      />
      {showOverlay ? (
        <div
          id={`${searchId}-results`}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto border border-line bg-panel"
          role="listbox"
          aria-label="Search results"
        >
          {isFull ? (
            <p className="px-3 py-3 text-sm text-muted">
              {fullMessage ?? "This ranking is full."}
            </p>
          ) : pending ? (
            <p className="px-3 py-3 text-sm text-muted">Searching…</p>
          ) : visibleHits.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">
              {hits.length === 0
                ? "No games found yet."
                : "Every result is already on your ballot."}
            </p>
          ) : (
            <ul>
              {visibleHits.map((hit) => (
                <li key={hit.id} role="option">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-paper"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(hit)}
                  >
                    <div className="w-8 shrink-0">
                      <GameCover title={hit.title} imageUrl={hit.coverUrl} />
                    </div>
                    <span>{hit.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

const EMPTY_IDS: ReadonlySet<string> = new Set();
