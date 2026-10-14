import type { ReactNode } from "react";
import { StandingStripDrag } from "@/components/communities/StandingStripDrag";

type StandingStripProps = {
  children: ReactNode;
  className?: string;
  /** Accessible name for the strip. */
  label?: string;
};

const edgeClass =
  "pointer-events-none absolute inset-y-0 z-10 w-6 opacity-0";

/**
 * Ranked horizontal strip. Overflow is native; mouse and pen drag, and the
 * edge fades, share one listener so each award is not its own client scroller.
 * Comparison boards that need column sync keep `HorizontalScroll`.
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
      <div data-strip className="group/strip relative w-full min-w-0">
        <StandingStripDrag />
        <div
          data-edge="left"
          aria-hidden
          className={`${edgeClass} left-0 bg-gradient-to-r from-paper to-transparent group-data-[can-left=true]/strip:opacity-100`}
        >
          <span className="absolute inset-y-0 left-0 w-px bg-accent/40" />
        </div>
        <div
          data-edge="right"
          aria-hidden
          className={`${edgeClass} right-0 bg-gradient-to-l from-paper to-transparent group-data-[can-right=true]/strip:opacity-100`}
        >
          <span className="absolute inset-y-0 right-0 w-px bg-accent/40" />
        </div>
        <div
          data-drag-scroll
          className="scrollbar-none w-full min-w-0 overflow-x-auto overflow-y-hidden data-[dragging=true]:cursor-grabbing data-[dragging=true]:select-none [&[data-dragging=true]_*]:cursor-grabbing [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none]"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
