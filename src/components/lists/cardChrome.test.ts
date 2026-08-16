/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import {
  CARD_DRAG_DELAY_MS,
  CARD_DRAG_TOLERANCE_PX,
  beginHoldScrollGuard,
  cardActionMenuClassName,
  cardTouchLockClassName,
} from "./cardChrome";

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

  it("styles a floating action menu for selected poster/grid cards", () => {
    expect(cardActionMenuClassName).toContain("absolute");
    expect(cardActionMenuClassName).toContain("border-line");
    expect(cardActionMenuClassName).toContain("bg-panel");
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

    // Cleanup listeners registered for this gesture.
    const pointerUp = addSpy.mock.calls.find(
      (call) => call[0] === "pointerup",
    )?.[1] as EventListener | undefined;
    pointerUp?.(new Event("pointerup"));
    expect(removeSpy).toHaveBeenCalled();

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
