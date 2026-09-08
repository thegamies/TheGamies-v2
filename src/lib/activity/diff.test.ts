import { describe, expect, it } from "vitest";
import { diffListGameIds } from "./diff";

describe("diffListGameIds", () => {
  it("ignores rank-only reshuffles", () => {
    expect(diffListGameIds(["a", "b"], ["b", "a"])).toEqual({
      added: [],
      removed: [],
    });
  });

  it("finds membership adds and removes", () => {
    expect(diffListGameIds(["a", "b"], ["a", "c"])).toEqual({
      added: ["c"],
      removed: ["b"],
    });
  });
});
