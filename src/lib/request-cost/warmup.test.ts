import { describe, expect, it } from "vitest";
import { costWarmupHits, DEFAULT_COST_WARMUP_HITS } from "./warmup";

describe("costWarmupHits", () => {
  it("defaults to three hits", () => {
    expect(costWarmupHits({})).toBe(DEFAULT_COST_WARMUP_HITS);
    expect(costWarmupHits({ COST_WARMUP_HITS: "" })).toBe(
      DEFAULT_COST_WARMUP_HITS,
    );
    expect(costWarmupHits({ COST_WARMUP_HITS: "  " })).toBe(
      DEFAULT_COST_WARMUP_HITS,
    );
  });

  it("parses a non-negative integer and caps a typo", () => {
    expect(costWarmupHits({ COST_WARMUP_HITS: "0" })).toBe(0);
    expect(costWarmupHits({ COST_WARMUP_HITS: "2" })).toBe(2);
    expect(costWarmupHits({ COST_WARMUP_HITS: "100" })).toBe(10);
  });

  it("ignores invalid values", () => {
    expect(costWarmupHits({ COST_WARMUP_HITS: "-1" })).toBe(
      DEFAULT_COST_WARMUP_HITS,
    );
    expect(costWarmupHits({ COST_WARMUP_HITS: "nope" })).toBe(
      DEFAULT_COST_WARMUP_HITS,
    );
  });
});
