import { describe, expect, it } from "vitest";
import { fieldInputClass } from "./controls";

describe("fieldInputClass", () => {
  it("uses 16px text on small screens to avoid iOS focus zoom", () => {
    expect(fieldInputClass).toContain("text-base");
    expect(fieldInputClass).toContain("lg:text-sm");
  });
});
