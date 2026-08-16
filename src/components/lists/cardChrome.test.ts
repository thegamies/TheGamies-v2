import { describe, expect, it } from "vitest";
import {
  CARD_DRAG_DELAY_MS,
  CARD_DRAG_TOLERANCE_PX,
  cardRemoveButtonClassName,
  cardTouchLockClassName,
} from "./cardChrome";

describe("list card chrome", () => {
  it("requires a short hold before drag starts", () => {
    expect(CARD_DRAG_DELAY_MS).toBeGreaterThanOrEqual(200);
    expect(CARD_DRAG_DELAY_MS).toBeLessThanOrEqual(500);
    expect(CARD_DRAG_TOLERANCE_PX).toBeGreaterThan(0);
  });

  it("locks mobile callout / selection on cards", () => {
    expect(cardTouchLockClassName).toContain("touch-manipulation");
    expect(cardTouchLockClassName).toContain("[-webkit-touch-callout:none]");
  });

  it("exposes an inset delete control class for selected cards", () => {
    expect(cardRemoveButtonClassName).toContain("absolute");
    expect(cardRemoveButtonClassName).toContain("rounded-full");
  });
});
