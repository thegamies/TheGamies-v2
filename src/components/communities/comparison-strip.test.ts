import { describe, expect, it } from "vitest";
import {
  comparisonColumnCount,
  comparisonStripTableClass,
  comparisonStripTableStyle,
} from "./comparison-strip";

describe("comparison strip width", () => {
  it("counts You, Community, Hosts, and each host", () => {
    expect(comparisonColumnCount(true, 3)).toBe(6);
    expect(comparisonColumnCount(false, 3)).toBe(5);
    expect(comparisonColumnCount(true, 0)).toBe(3);
  });

  it("fits five columns on a wide screen", () => {
    expect(comparisonStripTableClass(5)).toContain("comparison-strip--fit");
    expect(comparisonStripTableStyle(5)["--strip-cols"]).toBe("5");
  });

  it("fits three columns on a wide screen", () => {
    expect(comparisonStripTableClass(3)).toContain("comparison-strip--fit");
    expect(comparisonStripTableStyle(3)["--strip-cols"]).toBe("3");
  });

  it("lets a sixth column scroll at the editorial size", () => {
    expect(comparisonStripTableClass(6)).toBe("comparison-strip");
    expect(comparisonStripTableClass(6)).not.toContain("--fit");
    expect(comparisonStripTableStyle(6)["--strip-cols"]).toBe("6");
  });
});
