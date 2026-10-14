import type { ReactNode } from "react";

type StandingStripProps = {
  children: ReactNode;
  className?: string;
  /** Accessible name for the strip. */
  label?: string;
};

/**
 * Ranked horizontal strip with native overflow only — no client island.
 * Comparison boards that need drag sync keep `HorizontalScroll`.
 */
export function StandingStrip({
  children,
  className = "",
  label,
}: StandingStripProps) {
  return (
    <div
      className={`w-full min-w-0 ${className}`}
      role={label ? "region" : undefined}
      aria-label={label}
    >
      <div className="scrollbar-none w-full min-w-0 overflow-x-auto overflow-y-hidden [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none]">
        {children}
      </div>
    </div>
  );
}
