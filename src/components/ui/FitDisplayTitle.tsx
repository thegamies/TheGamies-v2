"use client";

import { useLayoutEffect, useRef } from "react";

type FitDisplayTitleProps = {
  children: string;
  className?: string;
  /** Largest display size to try (px). */
  maxPx: number;
  /** Smallest allowed display size (px). */
  minPx?: number;
  /** Max lines before clamp. Also reserves this many lines of height. */
  lines?: number;
};

/** Matches Tailwind `leading-snug` used on the title. */
const LINE_HEIGHT = 1.375;

/**
 * Display title that shrinks between maxPx → minPx until it fits in `lines`,
 * then clamps. A wrapper reserves `lines`×maxPx so layout doesn’t jump; the
 * text itself uses `max-height: N * line-height em` so it cannot exceed N lines
 * even when the font shrinks.
 *
 * Observes the wrapper (not the text node) and skips no-op font updates so
 * ResizeObserver can’t loop on mobile Safari.
 */
export function FitDisplayTitle({
  children,
  className = "",
  maxPx,
  minPx = 12,
  lines = 3,
}: FitDisplayTitleProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const ref = useRef<HTMLParagraphElement>(null);
  const reservedPx = Math.ceil(lines * maxPx * LINE_HEIGHT);
  const clampClass = lines <= 2 ? "line-clamp-2" : "line-clamp-3";

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const el = ref.current;
    if (!wrap || !el) return;

    let lastBest = -1;
    let raf = 0;

    const fit = () => {
      raf = 0;
      let lo = minPx;
      let hi = maxPx;
      let best = minPx;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        el.style.fontSize = `${mid}px`;
        if (el.scrollHeight <= el.clientHeight + 1) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      if (best === lastBest) return;
      lastBest = best;
      el.style.fontSize = `${best}px`;
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(fit);
    };

    fit();
    const ro = new ResizeObserver(schedule);
    ro.observe(wrap);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [children, maxPx, minPx, lines]);

  return (
    <span ref={wrapRef} className="block w-full" style={{ minHeight: reservedPx }}>
      <p
        ref={ref}
        title={children}
        className={`font-display tracking-wide text-ink overflow-hidden ${clampClass} ${className}`}
        style={{
          fontSize: maxPx,
          lineHeight: LINE_HEIGHT,
          maxHeight: `calc(${lines} * ${LINE_HEIGHT}em)`,
        }}
      >
        {children}
      </p>
    </span>
  );
}
