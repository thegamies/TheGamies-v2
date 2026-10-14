import type { ReactNode } from "react";
import { StandingStripDrag } from "@/components/communities/StandingStripDrag";

type StandingStripProps = {
  children: ReactNode;
  className?: string;
  /** Accessible name for the strip. */
  label?: string;
};

/**
 * Ranked horizontal strip. Overflow is native; mouse and pen drag share one
 * listener so each award is not its own client scroller. Comparison boards
 * that need column sync keep `HorizontalScroll`.
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
      <StandingStripDrag />
      <div
        data-drag-scroll
        className="scrollbar-none w-full min-w-0 overflow-x-auto overflow-y-hidden data-[dragging=true]:cursor-grabbing data-[dragging=true]:select-none [&[data-dragging=true]_*]:cursor-grabbing [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none]"
      >
        {children}
      </div>
    </div>
  );
}
