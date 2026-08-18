import { describe, expect, it } from "vitest";
import { NAVIGATION_PROGRESS } from "./NavigationProgress";

describe("NAVIGATION_PROGRESS", () => {
  it("uses the accent hairline without spinner or glow", () => {
    expect(NAVIGATION_PROGRESS).toEqual({
      color: "#ff5a1f",
      height: 2,
      showSpinner: false,
      shadow: false,
    });
  });
});
