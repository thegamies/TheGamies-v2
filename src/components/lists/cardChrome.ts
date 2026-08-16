"use client";

import {
  useEffect,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/** Hold briefly before a drag starts (avoids accidental moves). */
export const CARD_DRAG_DELAY_MS = 280;
export const CARD_DRAG_TOLERANCE_PX = 10;

/**
 * Block mobile callout / text selection / image-drag while interacting with cards.
 * Preview gestures are reduced here; OS-level peeks cannot be fully killed.
 */
export const cardTouchLockClassName =
  "select-none touch-manipulation [-webkit-touch-callout:none] [-webkit-user-select:none] [&_*]:select-none [&_img]:pointer-events-none [&_img]:[-webkit-user-drag:none]";

/** Floating action menu shown after tapping a Poster/Grid card. */
export const cardActionMenuClassName =
  "absolute left-1/2 top-1/2 z-[3] min-w-[7.5rem] -translate-x-1/2 -translate-y-1/2 border border-line bg-panel p-1";

export const cardActionMenuItemClassName =
  "w-full px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-paper hover:text-accent";

export const cardSelectedRingClassName =
  "ring-2 ring-accent ring-offset-2 ring-offset-paper";

/**
 * While the hold-to-drag gesture is pending or active, block vertical page
 * scroll from stealing the pointer. If the finger moves beyond tolerance
 * before the hold completes, release so the user can scroll normally.
 */
export function beginHoldScrollGuard(pointerEvent: PointerEvent): void {
  if (pointerEvent.pointerType === "mouse") return;

  const startX = pointerEvent.clientX;
  const startY = pointerEvent.clientY;
  const startedAt = performance.now();
  let released = false;

  const cleanup = () => {
    if (released) return;
    released = true;
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("pointerup", cleanup);
    document.removeEventListener("pointercancel", cleanup);
  };

  const onTouchMove = (event: TouchEvent) => {
    if (released) return;
    const touch = event.touches[0];
    if (!touch) return;
    const dist = Math.hypot(touch.clientX - startX, touch.clientY - startY);
    const elapsed = performance.now() - startedAt;

    if (elapsed < CARD_DRAG_DELAY_MS && dist > CARD_DRAG_TOLERANCE_PX) {
      cleanup();
      return;
    }
    event.preventDefault();
  };

  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("pointerup", cleanup);
  document.addEventListener("pointercancel", cleanup);
}

/** Merge dnd-kit listeners with the hold scroll guard. */
export function mergeHoldDragListeners(
  listeners: DraggableSyntheticListeners | undefined,
): DraggableSyntheticListeners {
  if (!listeners) return {};
  const prior = listeners.onPointerDown;
  return {
    ...listeners,
    onPointerDown: (event: SyntheticEvent) => {
      beginHoldScrollGuard(
        (event as ReactPointerEvent).nativeEvent as PointerEvent,
      );
      if (typeof prior === "function") {
        prior(event);
      }
    },
  };
}

/** Freeze document scroll while a card drag is active. */
export function useDragBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

export function useListCardDragSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: CARD_DRAG_DELAY_MS,
        tolerance: CARD_DRAG_TOLERANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}
