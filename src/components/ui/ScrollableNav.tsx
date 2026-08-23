"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type FadeFrom = "paper" | "panel";

type ScrollableNavProps = {
  children: ReactNode;
  "aria-label": string;
  className?: string;
  rowClassName?: string;
  /** Bottom hairline on the strip. Default true. */
  border?: boolean;
  /** Background matched by edge fades. Default paper. */
  fadeFrom?: FadeFrom;
  /** Use div (e.g. role=tablist) instead of nav. */
  as?: "nav" | "div";
  role?: "navigation" | "tablist";
  /** Cross-axis alignment. Default end (underline tabs). */
  align?: "end" | "center";
};

const fadeClass: Record<FadeFrom, string> = {
  paper: "from-paper",
  panel: "from-panel",
};

/**
 * Horizontal tab / chip strip — never wraps to a second line.
 * Hides scrollbars; shows edge fade + accent hairline when content overflows.
 */
export function ScrollableNav({
  children,
  "aria-label": ariaLabel,
  className = "",
  rowClassName = "gap-5",
  border = true,
  fadeFrom = "paper",
  as = "nav",
  role,
  align = "end",
}: ScrollableNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const syncEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    syncEdges();
    el.addEventListener("scroll", syncEdges, { passive: true });
    const ro = new ResizeObserver(syncEdges);
    ro.observe(el);
    for (const child of el.children) {
      ro.observe(child);
    }

    return () => {
      el.removeEventListener("scroll", syncEdges);
      ro.disconnect();
    };
  }, [syncEdges, children]);

  const borderClass = border ? "border-b border-line pb-0" : "";
  const Tag = as;

  return (
    <Tag
      aria-label={ariaLabel}
      role={role}
      className={`w-full min-w-0 ${borderClass} ${className}`.trim()}
    >
      <div className="relative w-full min-w-0">
        {canLeft ? (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r ${fadeClass[fadeFrom]} to-transparent`}
          >
            <span className="absolute inset-y-0 left-0 w-px bg-accent/40" />
          </div>
        ) : null}
        {canRight ? (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l ${fadeClass[fadeFrom]} to-transparent`}
          >
            <span className="absolute inset-y-0 right-0 w-px bg-accent/40" />
          </div>
        ) : null}
        <div
          ref={scrollRef}
          className={`scrollbar-none flex w-full min-w-0 flex-nowrap overflow-x-auto ${
            align === "center" ? "items-center" : "items-end"
          } ${rowClassName} [&_a]:shrink-0 [&_a]:whitespace-nowrap [&_button]:shrink-0 [&_button]:whitespace-nowrap [&_span[aria-hidden]]:shrink-0`}
        >
          {children}
        </div>
      </div>
    </Tag>
  );
}
