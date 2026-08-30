import { describe, expect, it } from "vitest";
import { yearSelectMenuEdge } from "./yearSelectMenu";

describe("yearSelectMenuEdge", () => {
  it("hangs from the start when the trigger is near the left edge", () => {
    expect(
      yearSelectMenuEdge({
        triggerLeft: 16,
        triggerRight: 88,
        menuWidth: 120,
        viewportWidth: 360,
      }),
    ).toBe("start");
  });

  it("hangs from the end when the trigger is near the right edge", () => {
    expect(
      yearSelectMenuEdge({
        triggerLeft: 272,
        triggerRight: 344,
        menuWidth: 120,
        viewportWidth: 360,
      }),
    ).toBe("end");
  });

  it("prefers the end when both alignments fit", () => {
    expect(
      yearSelectMenuEdge({
        triggerLeft: 800,
        triggerRight: 880,
        menuWidth: 120,
        viewportWidth: 1280,
      }),
    ).toBe("end");
  });
});
