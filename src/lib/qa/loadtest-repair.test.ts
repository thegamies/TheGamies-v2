import { describe, expect, it } from "vitest";
import { repairLoadtestTgaYear } from "./loadtest-repair";
import type { Db } from "@thegamies/db";

describe("repairLoadtestTgaYear", () => {
  it("refuses years that are not the reserved load-test years", async () => {
    await expect(
      repairLoadtestTgaYear({} as Db, {
        year: 2026,
        phase: "open",
        communityId: "c1",
        gameId: "g1",
      }),
    ).rejects.toThrow(/not a load-test year/);
  });
});
