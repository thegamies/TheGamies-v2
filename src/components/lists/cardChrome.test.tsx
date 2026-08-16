/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CARD_DRAG_DELAY_MS,
  CARD_DRAG_TOLERANCE_PX,
  beginHoldScrollGuard,
  cardActionMenuItemClassName,
  cardTouchLockClassName,
  lockDocumentScroll,
} from "./cardChrome";
import { ListCardActionMenu } from "./ListCardActionMenu";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("list card chrome", () => {
  it("requires a short hold before drag starts", () => {
    expect(CARD_DRAG_DELAY_MS).toBeGreaterThanOrEqual(200);
    expect(CARD_DRAG_DELAY_MS).toBeLessThanOrEqual(500);
    expect(CARD_DRAG_TOLERANCE_PX).toBeGreaterThan(0);
  });

  it("locks mobile callout / selection / image-drag on cards", () => {
    expect(cardTouchLockClassName).toContain("touch-manipulation");
    expect(cardTouchLockClassName).toContain("[-webkit-touch-callout:none]");
    expect(cardTouchLockClassName).toContain("[&_img]:[-webkit-user-drag:none]");
  });

  it("styles remove menu items for the external card popover", () => {
    expect(cardActionMenuItemClassName).toContain("text-sm");
  });

  it("blocks touchmove while holding steady for drag", () => {
    const preventDefault = vi.fn();
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    beginHoldScrollGuard({
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    } as PointerEvent);

    const touchMoveHandler = addSpy.mock.calls.find(
      (call) => call[0] === "touchmove",
    )?.[1] as EventListener | undefined;
    expect(touchMoveHandler).toBeTypeOf("function");

    touchMoveHandler?.({
      touches: [{ clientX: 12, clientY: 12 }],
      preventDefault,
    } as unknown as TouchEvent);
    expect(preventDefault).toHaveBeenCalled();

    const pointerUp = addSpy.mock.calls.find(
      (call) => call[0] === "pointerup",
    )?.[1] as EventListener | undefined;
    pointerUp?.(new Event("pointerup"));
    expect(removeSpy).toHaveBeenCalled();

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("locks scroll without hiding the body scrollbar", () => {
    document.body.style.overflow = "";
    const unlock = lockDocumentScroll();

    expect(document.body.style.overflow).toBe("");

    const wheel = new Event("wheel", { cancelable: true });
    document.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);

    const key = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      cancelable: true,
    });
    document.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(true);

    unlock();
    const after = new Event("wheel", { cancelable: true });
    document.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});

describe("ListCardActionMenu", () => {
  it("portals an absolute popover with a danger Remove action", () => {
    const anchor = document.createElement("div");
    anchor.setAttribute("data-list-card", "game-1");
    Object.defineProperty(anchor, "getBoundingClientRect", {
      value: () => ({
        top: 200,
        bottom: 360,
        left: 40,
        right: 160,
        width: 120,
        height: 160,
        x: 40,
        y: 200,
        toJSON: () => ({}),
      }),
    });
    document.body.appendChild(anchor);

    const onRemove = vi.fn();
    render(<ListCardActionMenu anchorId="game-1" onRemove={onRemove} />);

    const menu = document.querySelector("[data-list-card-menu]");
    expect(menu).toBeTruthy();
    expect(menu?.parentElement).toBe(document.body);
    expect(menu?.className).toContain("absolute");
    const remove = screen.getByRole("menuitem", { name: "Remove" });
    expect(remove.className).toMatch(/bg-danger/);
  });
});
