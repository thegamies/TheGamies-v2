"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cardActionMenuItemClassName } from "@/components/lists/cardChrome";

const VIEWPORT_PAD = 8;
const MENU_GAP = 10;
const ARROW = 7;

type Placement = "top" | "bottom";

type MenuPos = {
  top: number;
  left: number;
  placement: Placement;
  arrowLeft: number;
};

/**
 * External Remove popover for Poster/Grid — sits outside the card and points
 * at it with a caret. Renders in a portal so poster scale/overflow cannot clip it.
 */
export function ListCardActionMenu({
  anchorId,
  onRemove,
}: {
  anchorId: string;
  onRemove: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<MenuPos | null>(null);

  useLayoutEffect(() => {
    function measure() {
      const anchor = document.querySelector(
        `[data-list-card="${CSS.escape(anchorId)}"]`,
      );
      const menu = menuRef.current;
      if (!(anchor instanceof HTMLElement) || !menu) {
        setPos(null);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const menuW = menuRect.width || 120;
      const menuH = menuRect.height || 40;
      const spaceAbove = rect.top - VIEWPORT_PAD;
      const needAbove = menuH + MENU_GAP + ARROW;
      const placement: Placement =
        spaceAbove >= needAbove ? "top" : "bottom";

      let top =
        placement === "top"
          ? rect.top - menuH - MENU_GAP
          : rect.bottom + MENU_GAP;
      let left = rect.left + rect.width / 2 - menuW / 2;
      left = Math.min(
        Math.max(left, VIEWPORT_PAD),
        window.innerWidth - menuW - VIEWPORT_PAD,
      );
      top = Math.min(
        Math.max(top, VIEWPORT_PAD),
        window.innerHeight - menuH - VIEWPORT_PAD,
      );

      const anchorCenterX = rect.left + rect.width / 2;
      const arrowLeft = Math.min(
        Math.max(anchorCenterX - left, ARROW + 4),
        menuW - ARROW - 4,
      );

      setPos({ top, left, placement, arrowLeft });
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorId]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      data-list-card-menu
      role="menu"
      className="fixed z-[70]"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="relative min-w-[7.5rem] border border-line bg-panel p-1">
        <button
          type="button"
          role="menuitem"
          data-list-card-delete
          className={cardActionMenuItemClassName}
          onClick={onRemove}
        >
          Remove
        </button>
        {pos ? (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={
              pos.placement === "top"
                ? {
                    left: pos.arrowLeft,
                    bottom: -ARROW,
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: `${ARROW}px solid transparent`,
                    borderRight: `${ARROW}px solid transparent`,
                    borderTop: `${ARROW}px solid var(--line)`,
                  }
                : {
                    left: pos.arrowLeft,
                    top: -ARROW,
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: `${ARROW}px solid transparent`,
                    borderRight: `${ARROW}px solid transparent`,
                    borderBottom: `${ARROW}px solid var(--line)`,
                  }
            }
          />
        ) : null}
        {pos ? (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={
              pos.placement === "top"
                ? {
                    left: pos.arrowLeft,
                    bottom: -(ARROW - 1.5),
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: `${ARROW - 1.5}px solid transparent`,
                    borderRight: `${ARROW - 1.5}px solid transparent`,
                    borderTop: `${ARROW - 1.5}px solid var(--panel)`,
                  }
                : {
                    left: pos.arrowLeft,
                    top: -(ARROW - 1.5),
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: `${ARROW - 1.5}px solid transparent`,
                    borderRight: `${ARROW - 1.5}px solid transparent`,
                    borderBottom: `${ARROW - 1.5}px solid var(--panel)`,
                  }
            }
          />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
