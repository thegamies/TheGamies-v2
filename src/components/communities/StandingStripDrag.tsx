"use client";

import { useEffect } from "react";

const DRAG_THRESHOLD_PX = 6;

type Drag = {
  pointerId: number;
  startX: number;
  startScroll: number;
  dragging: boolean;
  el: HTMLElement;
};

let installed = 0;
let drag: Drag | null = null;

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
  e.preventDefault();
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
  useEffect(() => {
    if (installed === 0) {
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", endDrag);
      document.addEventListener("pointercancel", endDrag);
    }
    installed += 1;
    return () => {
      installed -= 1;
      if (installed > 0) return;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", endDrag);
      document.removeEventListener("pointercancel", endDrag);
      drag = null;
    };
  }, []);

  return null;
}
