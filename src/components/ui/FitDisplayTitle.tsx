"use client";

import { useLayoutEffect, useRef } from "react";

type FitDisplayTitleProps = {
  children: string;
  className?: string;
  /** Largest display size to try (px). */
  maxPx: number;
  /** Smallest allowed display size (px). */
  minPx?: number;
  /** Max lines before clamp. */
  lines?: number;
};

/**
 * Display title that shrinks between maxPx → minPx until it fits in `lines`,
 * then clamps. Used on cover cards and podium columns.
 */
export function FitDisplayTitle({
  children,
  className = "",
  maxPx,
  minPx = 12,
  lines = 3,
}: FitDisplayTitleProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
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
      el.style.fontSize = `${best}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, maxPx, minPx, lines]);

  return (
    <p
      ref={ref}
      title={children}
      className={`font-display leading-snug tracking-wide text-ink ${className}`}
      style={{
        fontSize: maxPx,
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: lines,
        overflow: "hidden",
      }}
    >
      {children}
    </p>
  );
}
