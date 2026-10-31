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
/** Keep peers muted / driver marked until scroll events pause. */
const DRIVER_SETTLE_MS = 160;

type ScrollSyncGroup = {
  members: Set<HTMLElement>;
  /** User-driven strip; cleared when the gesture settles. */
  driver: HTMLElement | null;
  settleTimer: ReturnType<typeof setTimeout> | null;
  /** Last agreed horizontal position for the group. */
  sharedLeft: number;
  /**
   * Members receiving programmatic `scrollLeft` writes. Stays set for the whole
   * gesture so scroll events cannot rebroadcast or fight the pointer driver.
   */
  muted: Set<HTMLElement>;
};

const scrollSyncGroups = new Map<string, ScrollSyncGroup>();
const HorizontalScrollGroupContext = createContext<string | null>(null);

/**
 * Sibling `HorizontalScroll` strips share one horizontal position.
 * Used for GOTY Comparison so #1–#10 stay on the same columns.
 *
 * Grouped strips are pointer/wheel-driven in lockstep (same `scrollLeft` in the
 * same move frame). Native touch/trackpad scroll is disabled on the group so
 * peers never lag a compositor frame behind the finger.
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

function setMemberScrollLeft(
  group: ScrollSyncGroup,
  el: HTMLElement,
  left: number,
) {
  if (el.scrollLeft === left) return;
  group.muted.add(el);
  // Instant jump — never smooth. Peers must match the finger, not ease toward it.
  el.scrollLeft = left;
}

function joinScrollSyncGroup(id: string, el: HTMLElement): () => void {
  let group = scrollSyncGroups.get(id);
  if (!group) {
    group = {
      members: new Set(),
      driver: null,
      settleTimer: null,
      sharedLeft: 0,
      muted: new Set(),
    };
    scrollSyncGroups.set(id, group);
  }
  group.members.add(el);
  if (el.scrollLeft !== group.sharedLeft) {
    setMemberScrollLeft(group, el, group.sharedLeft);
  }
  return () => {
    const cur = scrollSyncGroups.get(id);
    if (!cur) return;
    cur.members.delete(el);
    cur.muted.delete(el);
    if (cur.driver === el) cur.driver = null;
    if (cur.members.size === 0) {
      if (cur.settleTimer) clearTimeout(cur.settleTimer);
      scrollSyncGroups.delete(id);
    }
  };
}

/** True when this strip’s scroll is from sync, not the user. */
export function isScrollSyncPeer(id: string, el: HTMLElement): boolean {
  const group = scrollSyncGroups.get(id);
  if (!group) return false;
  return group.muted.has(el);
}

function settleDriver(group: ScrollSyncGroup, source: HTMLElement) {
  if (group.driver !== source) return;
  group.driver = null;
  for (const el of group.members) {
    setMemberScrollLeft(group, el, group.sharedLeft);
  }
  // Drop mutes after any late programmatic scroll events have flushed.
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      group.muted.clear();
    });
  });
}

function refreshDriver(group: ScrollSyncGroup, source: HTMLElement) {
  group.driver = source;
  if (group.settleTimer) clearTimeout(group.settleTimer);
  group.settleTimer = setTimeout(() => {
    group.settleTimer = null;
    settleDriver(group, source);
  }, DRIVER_SETTLE_MS);
}

/**
 * Set every strip in the group to the same left in this turn — including the
 * source — so a wiggle cannot leave peers a frame behind.
 */
function applyGroupScrollLeft(
  id: string,
  left: number,
  source: HTMLElement,
) {
  const group = scrollSyncGroups.get(id);
  if (!group) return;

  refreshDriver(group, source);
  const next = Math.max(0, left);
  group.sharedLeft = next;

  for (const el of group.members) {
    setMemberScrollLeft(group, el, next);
  }
}

function broadcastScrollSync(id: string, source: HTMLElement) {
  const group = scrollSyncGroups.get(id);
  if (!group) return;
  // Programmatic writes never drive. Fallback for non-pointer scroll sources.
  if (group.muted.has(source)) return;
  applyGroupScrollLeft(id, source.scrollLeft, source);
}

/** Test helper — clear module sync state between cases. */
export function resetScrollSyncGroupsForTests() {
  for (const group of scrollSyncGroups.values()) {
    if (group.settleTimer) clearTimeout(group.settleTimer);
  }
  scrollSyncGroups.clear();
}

function updateEdgeDataset(host: HTMLElement | null, body: HTMLElement) {
  if (!host) return;
  const max = body.scrollWidth - body.clientWidth;
  if (body.scrollLeft > 2) host.dataset.canLeft = "true";
  else delete host.dataset.canLeft;
  if (max > 2 && body.scrollLeft < max - 2) host.dataset.canRight = "true";
  else delete host.dataset.canRight;
}

function clampScrollLeft(el: HTMLElement, left: number) {
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  return Math.max(0, Math.min(max, left));
}

/**
 * Horizontal strip for matrices / pick rows.
 *
 * Ungrouped: mouse/pen drag; touch/trackpad use native overflow scroll.
 * Grouped (GOTY Comparison): pointer + wheel drive every strip in lockstep in
 * the same frame — native horizontal pan is off (`overflow-x-hidden` +
 * `touch-action: pan-y`) so peers cannot lag behind compositor scrolling.
 * Vertical page scroll stays native. Rubber-band overscroll is off.
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
  const edgeHostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScroll: number;
    /** null = axis not chosen yet; true = horizontal pan; false = abandoned. */
    horizontal: boolean | null;
  } | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [dragging, setDragging] = useState(false);
  const syncGroupId = useContext(HorizontalScrollGroupContext);
  const grouped = syncGroupId != null;

  const syncChrome = useCallback(
    (opts?: { allowBroadcast?: boolean }) => {
      const body = bodyRef.current;
      if (!body) return;
      const header = headerRef.current;
      if (header && header.scrollLeft !== body.scrollLeft) {
        header.scrollLeft = body.scrollLeft;
      }
      updateEdgeDataset(edgeHostRef.current, body);

      if (showArrowControls) {
        const max = body.scrollWidth - body.clientWidth;
        setCanLeft(body.scrollLeft > 2);
        setCanRight(max > 2 && body.scrollLeft < max - 2);
      }

      if (
        opts?.allowBroadcast !== false &&
        syncGroupId &&
        !isScrollSyncPeer(syncGroupId, body)
      ) {
        broadcastScrollSync(syncGroupId, body);
      }
    },
    [showArrowControls, syncGroupId],
  );

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const leaveGroup = syncGroupId
      ? joinScrollSyncGroup(syncGroupId, body)
      : undefined;

    const onScroll = () => {
      const peer =
        syncGroupId != null && isScrollSyncPeer(syncGroupId, body);
      // Grouped strips are pointer/wheel-driven; scroll is only chrome update.
      syncChrome({
        allowBroadcast: !peer && !grouped,
      });
    };

    const onScrollEnd = () => {
      if (!syncGroupId) return;
      const group = scrollSyncGroups.get(syncGroupId);
      if (!group || group.driver !== body) return;
      if (group.settleTimer) clearTimeout(group.settleTimer);
      group.settleTimer = null;
      settleDriver(group, body);
    };

    const onWheel = (e: WheelEvent) => {
      if (!syncGroupId) return;
      // Keep vertical page scroll; only lockstep on dominant horizontal deltas.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (body.scrollWidth <= body.clientWidth + 2) return;
      e.preventDefault();
      const next = clampScrollLeft(body, body.scrollLeft + e.deltaX);
      applyGroupScrollLeft(syncGroupId, next, body);
      if (headerRef.current) headerRef.current.scrollLeft = next;
      updateEdgeDataset(edgeHostRef.current, body);
    };

    syncChrome({ allowBroadcast: false });
    body.addEventListener("scroll", onScroll, { passive: true });
    body.addEventListener("scrollend", onScrollEnd, { passive: true });
    if (grouped) {
      body.addEventListener("wheel", onWheel, { passive: false });
    }
    const ro = new ResizeObserver(() => {
      syncChrome({ allowBroadcast: false });
    });
    ro.observe(body);

    return () => {
      body.removeEventListener("scroll", onScroll);
      body.removeEventListener("scrollend", onScrollEnd);
      if (grouped) body.removeEventListener("wheel", onWheel);
      ro.disconnect();
      leaveGroup?.();
    };
  }, [syncChrome, children, stickyHeader, syncGroupId, grouped]);

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

    if (syncGroupId) {
      applyGroupScrollLeft(syncGroupId, next, el);
      if (headerRef.current) headerRef.current.scrollLeft = next;
      updateEdgeDataset(edgeHostRef.current, el);
      return;
    }

    el.scrollTo({ left: next, behavior: "smooth" });
    if (headerRef.current) headerRef.current.scrollLeft = next;
    syncChrome();
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    // Ungrouped: mouse/pen drag only — touch keeps native overflow scroll.
    if (!grouped && e.pointerType !== "mouse" && e.pointerType !== "pen") {
      return;
    }
    const el = bodyRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 2) return;

    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScroll: grouped
        ? (scrollSyncGroups.get(syncGroupId!)?.sharedLeft ?? el.scrollLeft)
        : el.scrollLeft,
      horizontal: null,
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = bodyRef.current;
    if (!state || !el || e.pointerId !== state.pointerId) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (state.horizontal === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_THRESHOLD_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical intent — abandon so the page can scroll.
        drag.current = null;
        return;
      }
      state.horizontal = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }

    if (!state.horizontal) return;

    const next = clampScrollLeft(el, state.startScroll - dx);
    if (syncGroupId) {
      applyGroupScrollLeft(syncGroupId, next, el);
    } else {
      el.scrollLeft = next;
    }
    if (headerRef.current) headerRef.current.scrollLeft = next;
    updateEdgeDataset(edgeHostRef.current, el);
    e.preventDefault();
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = bodyRef.current;
    if (!state || e.pointerId !== state.pointerId) return;

    if (state.horizontal) {
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
    syncChrome({ allowBroadcast: false });
  }

  const showControls = showArrowControls && (canLeft || canRight);
  const overflowClass = /overflow-/.test(viewportClassName)
    ? ""
    : grouped
      ? // Programmatic scrollLeft only — native pan would paint this strip first.
        "overflow-x-hidden overflow-y-hidden"
      : "overflow-x-auto overflow-y-hidden";

  // overscroll-x-none: no rubber-band. touch-pan-y: page can still scroll vertically.
  const viewportChrome = `scrollbar-none overscroll-x-none ${
    grouped ? "touch-pan-y" : ""
  } ${overflowClass} [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none] ${
    showControls || grouped ? "cursor-grab [&_a]:cursor-grab" : ""
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
            className="scrollbar-none overscroll-x-none w-full min-w-0 overflow-x-auto overflow-y-hidden pointer-events-none [&_a]:pointer-events-auto"
          >
            {stickyHeader}
          </div>
        </div>
      ) : null}

      <div
        ref={edgeHostRef}
        className="group/hscroll relative w-full min-w-0"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-paper to-transparent opacity-0 group-data-[can-left=true]/hscroll:opacity-100"
        >
          <span className="absolute inset-y-0 left-0 w-px bg-accent/40" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-paper to-transparent opacity-0 group-data-[can-right=true]/hscroll:opacity-100"
        >
          <span className="absolute inset-y-0 right-0 w-px bg-accent/40" />
        </div>
        <div
          ref={bodyRef}
          data-hscroll-body=""
          data-hscroll-grouped={grouped ? "true" : undefined}
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
