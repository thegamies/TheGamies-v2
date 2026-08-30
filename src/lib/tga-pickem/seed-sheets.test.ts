import { describe, expect, it } from "vitest";
import {
  buildSeedTgaPicks,
  pickSeedNomineeId,
  seedWorldPremieresGuess,
  tgaCommunitySeedSlugError,
} from "./seed-sheets";

describe("buildSeedTgaPicks", () => {
  it("picks one nominee per category that has nominees", () => {
    const picks = buildSeedTgaPicks(
      [
        { id: "goty", nomineeIds: ["a", "b"] },
        { id: "empty", nomineeIds: [] },
        { id: "audio", nomineeIds: ["c"] },
      ],
      () => 0,
    );
    expect(picks).toEqual({ goty: "a", audio: "c" });
  });
});

describe("tgaCommunitySeedSlugError", () => {
  it("requires a slug before seeding a community", () => {
    expect(tgaCommunitySeedSlugError("")).toBe("Enter a community slug.");
    expect(tgaCommunitySeedSlugError("   ")).toBe("Enter a community slug.");
    expect(tgaCommunitySeedSlugError("eric")).toBeNull();
  });
});

describe("seed helpers", () => {
  it("stays in range", () => {
    expect(pickSeedNomineeId([], () => 0)).toBeNull();
    expect(pickSeedNomineeId(["x", "y"], () => 0.99)).toBe("y");
    expect(seedWorldPremieresGuess(() => 0, 14)).toBe(9);
    expect(seedWorldPremieresGuess(() => 0.99, 14)).toBe(19);
  });
});
