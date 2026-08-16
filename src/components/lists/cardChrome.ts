"use client";

import { useSensor, useSensors, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { CSSProperties } from "react";

/** Hold briefly before a drag starts (avoids accidental moves). */
export const CARD_DRAG_DELAY_MS = 280;
export const CARD_DRAG_TOLERANCE_PX = 10;

/** Block mobile callout / text selection while interacting with cards. */
export const cardTouchLockClassName =
  "select-none touch-manipulation [-webkit-touch-callout:none] [-webkit-user-select:none]";

/** Inset delete control — only shown when a card is selected. */
export const cardRemoveButtonStyle: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  zIndex: 2,
  width: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  background: "rgba(128, 128, 128, 0.55)",
  color: "#000",
  border: "1.5px solid rgba(0, 0, 0, 0.35)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  padding: 0,
};

export const cardRemoveButtonClassName =
  "absolute top-2 right-2 z-[2] grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-black/35 text-sm font-bold leading-none text-black [background:rgba(128,128,128,0.55)]";

export const cardSelectedRingClassName =
  "ring-2 ring-accent ring-offset-2 ring-offset-paper";

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
