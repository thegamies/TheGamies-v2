"use client";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { mergeHoldDragListeners } from "@/components/lists/cardChrome";

export function ListDragHandle({
  listeners,
  attributes,
}: {
  listeners: DraggableSyntheticListeners | undefined;
  attributes: DraggableAttributes;
}) {
  const holdListeners = mergeHoldDragListeners(listeners);

  return (
    <button
      type="button"
      className="flex h-10 w-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink"
      aria-label="Hold to move"
      {...attributes}
      {...holdListeners}
    >
      <svg
        width="10"
        height="16"
        viewBox="0 0 10 16"
        aria-hidden
        fill="currentColor"
      >
        <circle cx="2" cy="2" r="1.25" />
        <circle cx="8" cy="2" r="1.25" />
        <circle cx="2" cy="8" r="1.25" />
        <circle cx="8" cy="8" r="1.25" />
        <circle cx="2" cy="14" r="1.25" />
        <circle cx="8" cy="14" r="1.25" />
      </svg>
    </button>
  );
}
