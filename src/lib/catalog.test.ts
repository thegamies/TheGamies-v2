import { describe, expect, it } from "vitest";
import { upcomingReleaseWindow } from "./catalog";

describe("upcomingReleaseWindow", () => {
  it("starts at UTC midnight and ends six months later on the same calendar day", () => {
    const { after, onOrBefore } = upcomingReleaseWindow(
      new Date("2026-09-15T18:40:00.000Z"),
    );
    expect(after.toISOString()).toBe("2026-09-15T00:00:00.000Z");
    expect(onOrBefore.toISOString()).toBe("2027-03-15T00:00:00.000Z");
  });
});
