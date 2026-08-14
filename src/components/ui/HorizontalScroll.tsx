"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";

type HorizontalScrollProps = {
  children: ReactNode;
  className?: string;
  /** Extra classes on the scroll viewport (e.g. border-y). */
  viewportClassName?: string;
  /** Accessible name for the strip (announced on the prev/next controls). */
  label?: string;
  /**
   * Optional header row rendered in a page-sticky bar. Tracks body scroll only
   * (never drives it) — no nested vertical scrollport.
   */
  stickyHeader?: ReactNode;
  /** Prev/next arrow buttons when content overflows. Off for now. */
  showArrowControls?: boolean;
};

const DRAG_THRESHOLD_PX = 6;

type ScrollSyncGroup = {
  members: Set<HTMLElement>;
  applying: boolean;
};

const scrollSyncGroups = new Map<string, ScrollSyncGroup>();
const HorizontalScrollGroupContext = createContext<string | null>(null);

/**
 * Sibling `HorizontalScroll` strips share one horizontal position.
 * Used for GOTY Comparison so #1–#10 stay on the same columns.
 */
export function HorizontalScrollGroup({
  groupId,
  children,
}: {
  groupId: string;
  children: ReactNode;
}) {
  return (
    <HorizontalScrollGroupContext.Provider value={groupId}>
      {children}
    </HorizontalScrollGroupContext.Provider>
  );
}

function joinScrollSyncGroup(id: string, el: HTMLElement): () => void {
  let group = scrollSyncGroups.get(id);
  if (!group) {
    group = { members: new Set(), applying: false };
    scrollSyncGroups.set(id, group);
  }
  const peer = group.members.values().next().value as HTMLElement | undefined;
  group.members.add(el);
  if (peer && peer.scrollLeft !== el.scrollLeft) {
    el.scrollLeft = peer.scrollLeft;
  }
  return () => {
    const cur = scrollSyncGroups.get(id);
    if (!cur) return;
    cur.members.delete(el);
    if (cur.members.size === 0) scrollSyncGroups.delete(id);
  };
}

function broadcastScrollSync(id: string, source: HTMLElement) {
  const group = scrollSyncGroups.get(id);
  if (!group || group.applying) return;
  group.applying = true;
  try {
    const left = source.scrollLeft;
    for (const el of group.members) {
      if (el !== source && el.scrollLeft !== left) {
        el.scrollLeft = left;
      }
    }
  } finally {
    group.applying = false;
  }
}

/**
 * Horizontal strip for matrices / pick rows.
 *
 * Pan: drag (after a small move so links still click), prev/next when overflow
 * exists. Touch/trackpad use native scroll (including horizontal gestures).
 * Vertical wheel always scrolls the page — never remapped. Scrollbars stay
 * hidden; edge fades mark overflow.
 */
export function HorizontalScroll({
  children,
  className = "",
  viewportClassName = "",
  label = "Horizontal list",
  stickyHeader,
  showArrowControls = false,
}: HorizontalScrollProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    dragging: boolean;
  } | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [dragging, setDragging] = useState(false);
  const syncGroupId = useContext(HorizontalScrollGroupContext);

  const syncHeaderToBody = useCallback(() => {
    const body = bodyRef.current;
    const header = headerRef.current;
    if (!body) return;
    if (header && header.scrollLeft !== body.scrollLeft) {
      header.scrollLeft = body.scrollLeft;
    }
    const max = body.scrollWidth - body.clientWidth;
    setCanLeft(body.scrollLeft > 2);
    setCanRight(max > 2 && body.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const leaveGroup = syncGroupId
      ? joinScrollSyncGroup(syncGroupId, body)
      : undefined;

    const onScroll = () => {
      syncHeaderToBody();
      if (syncGroupId) broadcastScrollSync(syncGroupId, body);
    };

    onScroll();
    body.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(body);

    return () => {
      body.removeEventListener("scroll", onScroll);
      ro.disconnect();
      leaveGroup?.();
    };
  }, [syncHeaderToBody, children, stickyHeader, syncGroupId]);

  function scrollByPage(direction: -1 | 1) {
    const el = bodyRef.current;
    if (!el) return;

    const port = el.clientWidth;
    const maxScroll = Math.max(0, el.scrollWidth - port);
    if (maxScroll <= 0) return;

    // Gradual step: ~3 matrix columns (119px), not a full viewport leap to the end.
    const amount = 360;
    const next = Math.max(
      0,
      Math.min(maxScroll, el.scrollLeft + direction * amount),
    );

    el.scrollTo({ left: next, behavior: "smooth" });
    if (headerRef.current) headerRef.current.scrollLeft = next;
    syncHeaderToBody();
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    if (e.button !== 0) return;
    const el = bodyRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 2) return;

    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      dragging: false,
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = bodyRef.current;
    if (!state || !el || e.pointerId !== state.pointerId) return;

    const dx = e.clientX - state.startX;
    if (!state.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      state.dragging = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }

    el.scrollLeft = state.startScroll - dx;
    if (headerRef.current) headerRef.current.scrollLeft = el.scrollLeft;
    e.preventDefault();
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = bodyRef.current;
    if (!state || e.pointerId !== state.pointerId) return;

    if (state.dragging) {
      const suppress = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
        el?.removeEventListener("click", suppress, true);
      };
      el?.addEventListener("click", suppress, true);
      window.setTimeout(
        () => el?.removeEventListener("click", suppress, true),
        0,
      );
      try {
        el?.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }

    drag.current = null;
    setDragging(false);
    syncHeaderToBody();
  }

  const showControls = showArrowControls && (canLeft || canRight);
  const overflowClass = /overflow-/.test(viewportClassName)
    ? ""
    : "overflow-x-auto";

  const viewportChrome = `scrollbar-none ${overflowClass} [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none] ${
    showControls ? "cursor-grab [&_a]:cursor-grab" : ""
  } ${dragging ? "cursor-grabbing select-none [&_*]:cursor-grabbing" : ""}`;

  return (
    <div className={`w-full min-w-0 ${className}`}>
      {showControls ? (
        <div className="mb-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={!canLeft}
            aria-label={`Scroll ${label} left`}
            onClick={() => scrollByPage(-1)}
          >
            ←
          </Button>
          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={!canRight}
            aria-label={`Scroll ${label} right`}
            onClick={() => scrollByPage(1)}
          >
            →
          </Button>
        </div>
      ) : null}

      {stickyHeader ? (
        <div className="sticky top-0 z-20 w-full min-w-0 border-b border-line bg-paper">
          <div
            ref={headerRef}
            // Mirror body scroll; links stay clickable (container ignores pan).
            className="scrollbar-none w-full min-w-0 overflow-x-auto pointer-events-none [&_a]:pointer-events-auto"
          >
            {stickyHeader}
          </div>
        </div>
      ) : null}

      <div className="relative w-full min-w-0">
        {canLeft ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-paper to-transparent"
          >
            <span className="absolute inset-y-0 left-0 w-px bg-accent/40" />
          </div>
        ) : null}
        {canRight ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-paper to-transparent"
          >
            <span className="absolute inset-y-0 right-0 w-px bg-accent/40" />
          </div>
        ) : null}
        <div
          ref={bodyRef}
          className={`${viewportChrome} w-full min-w-0 ${viewportClassName}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDragStart={(e) => e.preventDefault()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
