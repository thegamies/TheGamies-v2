"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

const DOC_PAD = 8;
const MENU_GAP = 8;
const ARROW = 7;
/** Stronger than `--line` so the popover reads on dark panel surfaces. */
const MENU_BORDER = "color-mix(in srgb, var(--ink) 55%, transparent)";

type Placement = "top" | "bottom";

type MenuPos = {
  top: number;
  left: number;
  placement: Placement;
  arrowLeft: number;
};

/**
 * External Remove popover for Poster/Grid — document-positioned (not `fixed`)
 * so browser zoom keeps it glued to the card, with a caret pointing at it.
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
      const menuH = menuRect.height || 44;

      // Prefer below when the card is near the top of the visual viewport so the
      // menu does not float far above a zoomed-in card.
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const need = menuH + MENU_GAP + ARROW;
      const placement: Placement =
        spaceAbove >= need && spaceAbove >= spaceBelow ? "top" : "bottom";

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const top =
        placement === "top"
          ? rect.top + scrollY - menuH - MENU_GAP
          : rect.bottom + scrollY + MENU_GAP;
      let left = rect.left + scrollX + rect.width / 2 - menuW / 2;

      const minLeft = scrollX + DOC_PAD;
      const maxLeft = scrollX + window.innerWidth - menuW - DOC_PAD;
      left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));

      const anchorCenterX = rect.left + scrollX + rect.width / 2;
      const arrowLeft = Math.min(
        Math.max(anchorCenterX - left, ARROW + 4),
        menuW - ARROW - 4,
      );

      setPos({ top, left, placement, arrowLeft });
    }

    measure();
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", measure);
    vv?.addEventListener("scroll", measure);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      vv?.removeEventListener("resize", measure);
      vv?.removeEventListener("scroll", measure);
    };
  }, [anchorId]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      data-list-card-menu
      role="menu"
      className="absolute z-[70]"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="relative min-w-[8rem] bg-panel p-1.5"
        style={{ border: `1.5px solid ${MENU_BORDER}` }}
      >
        <Button
          type="button"
          role="menuitem"
          data-list-card-delete
          variant="danger"
          size="sm"
          className="w-full"
          onClick={onRemove}
        >
          Remove
        </Button>
        {pos ? (
          <>
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
                      borderTop: `${ARROW}px solid ${MENU_BORDER}`,
                    }
                  : {
                      left: pos.arrowLeft,
                      top: -ARROW,
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: `${ARROW}px solid transparent`,
                      borderRight: `${ARROW}px solid transparent`,
                      borderBottom: `${ARROW}px solid ${MENU_BORDER}`,
                    }
              }
            />
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
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
