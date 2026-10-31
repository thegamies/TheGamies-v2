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
/** Keep the finger-driven strip as driver until scroll events pause. */
const DRIVER_SETTLE_MS = 160;

type ScrollSyncGroup = {
  members: Set<HTMLElement>;
  /** User-driven strip; peers must not rebroadcast while this is set. */
  driver: HTMLElement | null;
  settleTimer: ReturnType<typeof setTimeout> | null;
  /** True while a peer-apply frame is queued (boolean so sync rAF cannot stick). */
  frameScheduled: boolean;
  raf: number | null;
  pendingLeft: number | null;
  pendingSource: HTMLElement | null;
  /** Peers receiving a programmatic `scrollLeft` write this frame. */
  muted: WeakSet<HTMLElement>;
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
    group = {
      members: new Set(),
      driver: null,
      settleTimer: null,
      frameScheduled: false,
      raf: null,
      pendingLeft: null,
      pendingSource: null,
      muted: new WeakSet(),
    };
    scrollSyncGroups.set(id, group);
  }
  const peer = group.members.values().next().value as HTMLElement | undefined;
  group.members.add(el);
  if (peer && peer.scrollLeft !== el.scrollLeft) {
    group.muted.add(el);
    el.scrollLeft = peer.scrollLeft;
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        group?.muted.delete(el);
      });
    });
  }
  return () => {
    const cur = scrollSyncGroups.get(id);
    if (!cur) return;
    cur.members.delete(el);
    if (cur.driver === el) cur.driver = null;
    if (cur.pendingSource === el) cur.pendingSource = null;
    if (cur.members.size === 0) {
      if (cur.settleTimer) clearTimeout(cur.settleTimer);
      if (cur.raf != null) cancelAnimationFrame(cur.raf);
      cur.frameScheduled = false;
      scrollSyncGroups.delete(id);
    }
  };
}

/** True when this strip’s scroll is from sync, not the user. */
export function isScrollSyncPeer(id: string, el: HTMLElement): boolean {
  const group = scrollSyncGroups.get(id);
  if (!group) return false;
  if (group.muted.has(el)) return true;
  if (group.driver && group.driver !== el) return true;
  return false;
}

function refreshDriver(group: ScrollSyncGroup, source: HTMLElement) {
  group.driver = source;
  if (group.settleTimer) clearTimeout(group.settleTimer);
  group.settleTimer = setTimeout(() => {
    if (group.driver === source) group.driver = null;
    group.settleTimer = null;
  }, DRIVER_SETTLE_MS);
}

function applyPendingScroll(group: ScrollSyncGroup) {
  group.frameScheduled = false;
  group.raf = null;
  const left = group.pendingLeft;
  const source = group.pendingSource;
  group.pendingLeft = null;
  group.pendingSource = null;
  if (left == null || !source) return;

  for (const el of group.members) {
    if (el === source || el.scrollLeft === left) continue;
    group.muted.add(el);
    el.scrollLeft = left;
    // Programmatic scroll events often fire after this stack (esp. mobile).
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        group.muted.delete(el);
      });
    });
  }
}

function broadcastScrollSync(id: string, source: HTMLElement) {
  const group = scrollSyncGroups.get(id);
  if (!group) return;
  // Peer / muted strips never become the driver.
  if (group.muted.has(source)) return;
  if (group.driver && group.driver !== source) return;

  refreshDriver(group, source);
  group.pendingLeft = source.scrollLeft;
  group.pendingSource = source;
  if (group.frameScheduled) return;
  group.frameScheduled = true;
  group.raf = requestAnimationFrame(() => applyPendingScroll(group));
}

/** Test helper — clear module sync state between cases. */
export function resetScrollSyncGroupsForTests() {
  for (const group of scrollSyncGroups.values()) {
    if (group.settleTimer) clearTimeout(group.settleTimer);
    if (group.raf != null) cancelAnimationFrame(group.raf);
    group.frameScheduled = false;
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

/**
 * Horizontal strip for matrices / pick rows.
 *
 * Pan: drag (after a small move so links still click), prev/next when overflow
 * exists. Touch/trackpad use native scroll (including horizontal gestures).
 * Vertical wheel always scrolls the page — never remapped. Scrollbars stay
 * hidden; edge fades mark overflow. `overflow-y` is hidden so a 1px-tall
 * mismatch cannot create a nested vertical scrollport.
 *
 * Grouped strips: only the user-driven strip broadcasts `scrollLeft`. Peers
 * apply that position and must not rebroadcast (avoids mobile fling thrash).
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
    startScroll: number;
    dragging: boolean;
  } | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [dragging, setDragging] = useState(false);
  const syncGroupId = useContext(HorizontalScrollGroupContext);

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
      // Peers still mirror sticky headers + edge fades locally; they must not
      // rebroadcast (that fights momentum scroll on phones).
      const peer =
        syncGroupId != null && isScrollSyncPeer(syncGroupId, body);
      syncChrome({ allowBroadcast: !peer });
    };

    const onScrollEnd = () => {
      if (!syncGroupId) return;
      const group = scrollSyncGroups.get(syncGroupId);
      if (!group || group.driver !== body) return;
      if (group.settleTimer) clearTimeout(group.settleTimer);
      group.settleTimer = null;
      group.driver = null;
    };

    syncChrome();
    body.addEventListener("scroll", onScroll, { passive: true });
    body.addEventListener("scrollend", onScrollEnd, { passive: true });
    const ro = new ResizeObserver(() => {
      syncChrome({ allowBroadcast: false });
    });
    ro.observe(body);

    return () => {
      body.removeEventListener("scroll", onScroll);
      body.removeEventListener("scrollend", onScrollEnd);
      ro.disconnect();
      leaveGroup?.();
    };
  }, [syncChrome, children, stickyHeader, syncGroupId]);

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
    syncChrome();
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
    syncChrome();
  }

  const showControls = showArrowControls && (canLeft || canRight);
  const overflowClass = /overflow-/.test(viewportClassName)
    ? ""
    : "overflow-x-auto overflow-y-hidden";

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
            className="scrollbar-none w-full min-w-0 overflow-x-auto overflow-y-hidden pointer-events-none [&_a]:pointer-events-auto"
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
