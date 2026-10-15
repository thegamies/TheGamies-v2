"use client";

import { useEffect, useRef } from "react";

const DRAG_THRESHOLD_PX = 6;
const EDGE_SLOP_PX = 2;

type Drag = {
  pointerId: number;
  startX: number;
  startScroll: number;
  dragging: boolean;
  el: HTMLElement;
};

const scrollers = new Set<HTMLElement>();
let drag: Drag | null = null;
let resizeObserver: ResizeObserver | null = null;

function syncStripEdges(el: HTMLElement) {
  const strip = el.closest("[data-strip]");
  if (!(strip instanceof HTMLElement)) return;
  const max = el.scrollWidth - el.clientWidth;
  if (el.scrollLeft > EDGE_SLOP_PX) strip.dataset.canLeft = "true";
  else delete strip.dataset.canLeft;
  if (max > EDGE_SLOP_PX && el.scrollLeft < max - EDGE_SLOP_PX) {
    strip.dataset.canRight = "true";
  } else {
    delete strip.dataset.canRight;
  }
}

function viewportFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest("[data-drag-scroll]");
  return el instanceof HTMLElement ? el : null;
}

function onPointerDown(e: PointerEvent) {
  if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
  if (e.button !== 0) return;
  const el = viewportFrom(e.target);
  if (!el || el.scrollWidth <= el.clientWidth + 2) return;

  drag = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startScroll: el.scrollLeft,
    dragging: false,
    el,
  };
}

function onPointerMove(e: PointerEvent) {
  if (!drag || e.pointerId !== drag.pointerId) return;

  const dx = e.clientX - drag.startX;
  if (!drag.dragging) {
    if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    drag.dragging = true;
    drag.el.dataset.dragging = "true";
    try {
      drag.el.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom and already-captured pointers */
    }
  }

  drag.el.scrollLeft = drag.startScroll - dx;
  syncStripEdges(drag.el);
  e.preventDefault();
}

function onScroll(e: Event) {
  const el = e.target;
  if (!(el instanceof HTMLElement) || !el.hasAttribute("data-drag-scroll")) return;
  syncStripEdges(el);
}

function installListeners() {
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  document.addEventListener("scroll", onScroll, true);
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLElement) syncStripEdges(entry.target);
      }
    });
  }
}

function removeListeners() {
  document.removeEventListener("pointerdown", onPointerDown);
  document.removeEventListener("pointermove", onPointerMove);
  document.removeEventListener("pointerup", endDrag);
  document.removeEventListener("pointercancel", endDrag);
  document.removeEventListener("scroll", onScroll, true);
  resizeObserver?.disconnect();
  resizeObserver = null;
  drag = null;
}

function endDrag(e: PointerEvent) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const { el, dragging } = drag;
  drag = null;

  if (!dragging) return;

  delete el.dataset.dragging;
  const suppress = (ev: Event) => {
    ev.preventDefault();
    ev.stopPropagation();
    el.removeEventListener("click", suppress, true);
  };
  el.addEventListener("click", suppress, true);
  window.setTimeout(() => el.removeEventListener("click", suppress, true), 0);
  try {
    el.releasePointerCapture(e.pointerId);
  } catch {
    /* already released */
  }
}

/**
 * One listener for every ranked strip. Strips stay server HTML; this does not
 * wrap each award in a client scroller.
 */
export function StandingStripDrag() {
  const markRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scroller = markRef.current
      ?.closest("[data-strip]")
      ?.querySelector("[data-drag-scroll]");
    if (!(scroller instanceof HTMLElement)) return;

    if (scrollers.size === 0) installListeners();
    scrollers.add(scroller);
    resizeObserver?.observe(scroller);
    syncStripEdges(scroller);

    return () => {
      scrollers.delete(scroller);
      resizeObserver?.unobserve(scroller);
      if (scrollers.size === 0) removeListeners();
    };
  }, []);

  return <span ref={markRef} hidden />;
}
