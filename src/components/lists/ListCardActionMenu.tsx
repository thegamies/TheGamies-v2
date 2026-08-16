"use client";

import {
  cardActionMenuClassName,
  cardActionMenuItemClassName,
} from "@/components/lists/cardChrome";

/** Small select menu for Poster/Grid cards (tap card → remove). */
export function ListCardActionMenu({
  onRemove,
}: {
  onRemove: () => void;
}) {
  return (
    <div
      data-list-card-menu
      role="menu"
      className={cardActionMenuClassName}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        data-list-card-delete
        className={cardActionMenuItemClassName}
        onClick={onRemove}
      >
        Remove
      </button>
    </div>
  );
}
