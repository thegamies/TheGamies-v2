import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOTY_POSTER_TITLE,
  POSTER_MADE_WITH_BRAND,
  defaultPosterHeaderTitle,
} from "./listExportTypes";

describe("poster header copy", () => {
  it("uses GAME OF THE YEAR for GOTY, not the list title", () => {
    expect(DEFAULT_GOTY_POSTER_TITLE).toBe("GAME OF THE YEAR");
    expect(
      defaultPosterHeaderTitle("goty", "2026 Game of the Year"),
    ).toBe("GAME OF THE YEAR");
  });

  it("keeps custom list titles", () => {
    expect(defaultPosterHeaderTitle("custom", "All-timers")).toBe("All-timers");
    expect(defaultPosterHeaderTitle("custom", "  ")).toBe("MY LIST");
  });

  it("brands the poster as TheGamies.gg", () => {
    expect(POSTER_MADE_WITH_BRAND).toBe("TheGamies.gg");
  });
});
