"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { navItemClass } from "@/components/ui/navLevels";
import type { EditionCategoryStandingBlock } from "@/lib/communities/edition-results";
import {
  applyEditionCategoryRevealDebug,
  clampRevealTieCap,
  clampRevealTieRepeat,
  isEditionRevealTieDebugEnabled,
  REVEAL_TIE_CAP_MAX,
  REVEAL_TIE_REPEAT_OPTIONS,
} from "@/lib/communities/edition-reveal-tie-debug";

type EditionCategoryDebugValue = {
  enabled: boolean;
  categoryPodiums: EditionCategoryStandingBlock[];
  repeat: number;
  maxPerRank: number;
  setRepeat: (n: number) => void;
  setMaxPerRank: (n: number) => void;
};

const EditionCategoryDebugCtx = createContext<EditionCategoryDebugValue | null>(
  null,
);

export function EditionCategoryDebugProvider({
  categoryPodiums,
  children,
}: {
  categoryPodiums: EditionCategoryStandingBlock[];
  children: ReactNode;
}) {
  const enabled = isEditionRevealTieDebugEnabled();
  const [repeat, setRepeatState] = useState(1);
  const [maxPerRank, setMaxState] = useState(0);

  const setRepeat = (n: number) => setRepeatState(clampRevealTieRepeat(n));
  const setMaxPerRank = (n: number) => setMaxState(clampRevealTieCap(n));

  const adjusted = useMemo(() => {
    if (!enabled) return categoryPodiums;
    return applyEditionCategoryRevealDebug(categoryPodiums, {
      repeat,
      maxPerRank,
    });
  }, [categoryPodiums, enabled, repeat, maxPerRank]);

  const value = useMemo(
    () => ({
      enabled,
      categoryPodiums: adjusted,
      repeat,
      maxPerRank,
      setRepeat,
      setMaxPerRank,
    }),
    [enabled, adjusted, repeat, maxPerRank],
  );

  return (
    <EditionCategoryDebugCtx.Provider value={value}>
      {children}
    </EditionCategoryDebugCtx.Provider>
  );
}

/** Prefer debug-adjusted podiums when the provider is mounted. */
export function useEditionCategoryPodiums(
  fallback: EditionCategoryStandingBlock[],
): EditionCategoryStandingBlock[] {
  const ctx = useContext(EditionCategoryDebugCtx);
  return ctx?.categoryPodiums ?? fallback;
}

/**
 * Dev-only tertiary controls beside Community · Hosts.
 * No URL params — local stress-test for category Reveal mosaics.
 */
export function EditionCategoryDebugBar() {
  const ctx = useContext(EditionCategoryDebugCtx);
  if (!ctx?.enabled) return null;

  const cap = ctx.maxPerRank;

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1"
      aria-label="Category reveal stress test"
    >
      <span className="text-muted" aria-hidden>
        ·
      </span>
      <span className={navItemClass("tertiary", false)}>Repeat</span>
      {REVEAL_TIE_REPEAT_OPTIONS.map((n) => (
        <button
          key={`repeat-${n}`}
          type="button"
          className={navItemClass("tertiary", ctx.repeat === n)}
          onClick={() => ctx.setRepeat(n)}
        >
          {n === 1 ? "Off" : `×${n}`}
        </button>
      ))}
      <span className="text-muted" aria-hidden>
        ·
      </span>
      <span className={navItemClass("tertiary", false)}>Cap</span>
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          className={navItemClass("tertiary", false)}
          aria-label="Decrease per-rank cap"
          disabled={cap <= 0}
          onClick={() => ctx.setMaxPerRank(cap - 1)}
        >
          −
        </button>
        <span
          className={`min-w-[1.75rem] text-center ${navItemClass("tertiary", cap > 0)}`}
          title={
            cap === 0
              ? "No per-rank game limit"
              : `Keep at most ${cap} games per rank before repeat`
          }
        >
          {cap === 0 ? "Off" : cap}
        </span>
        <button
          type="button"
          className={navItemClass("tertiary", false)}
          aria-label="Increase per-rank cap"
          disabled={cap >= REVEAL_TIE_CAP_MAX}
          onClick={() => ctx.setMaxPerRank(cap + 1)}
        >
          +
        </button>
      </span>
    </div>
  );
}
