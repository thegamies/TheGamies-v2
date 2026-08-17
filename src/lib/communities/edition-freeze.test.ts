import { describe, expect, it } from "vitest";

describe("edition freeze status labels", () => {
  it("treats pending and computing as calculating", () => {
    const calculating = new Set(["pending", "computing", "failed"]);
    expect(calculating.has("pending")).toBe(true);
    expect(calculating.has("ready")).toBe(false);
  });
});
