import { describe, expect, it } from "vitest";
import { isCompleteTgaSheet } from "./sheet-complete";

describe("isCompleteTgaSheet", () => {
  it("requires every category plus a World Premieres guess", () => {
    expect(
      isCompleteTgaSheet(["a", "b"], { a: "1", b: "2" }, 12),
    ).toBe(true);
    expect(isCompleteTgaSheet(["a", "b"], { a: "1" }, 12)).toBe(false);
    expect(isCompleteTgaSheet(["a"], { a: "1" }, null)).toBe(false);
    expect(isCompleteTgaSheet([], {}, 0)).toBe(false);
  });
});
