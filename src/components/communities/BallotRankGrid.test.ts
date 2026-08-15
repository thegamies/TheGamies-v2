import { describe, expect, it } from "vitest";
import { ballotRankGridClass } from "./BallotRankGrid";

describe("ballotRankGridClass", () => {
  it("uses matching row and column gaps", () => {
    expect(ballotRankGridClass).toContain("gap-3");
    expect(ballotRankGridClass).toContain("sm:gap-4");
    expect(ballotRankGridClass).not.toContain("gap-y-");
    expect(ballotRankGridClass).not.toContain("gap-x-");
  });
});
