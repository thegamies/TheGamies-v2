import { describe, expect, it, vi } from "vitest";
import { ensurePublishedEditionResultsForEdition } from "./edition-results";

describe("ensurePublishedEditionResultsForEdition", () => {
  it("returns null without querying when the edition is not closed or published", async () => {
    const db = { select: vi.fn() };
    await expect(
      ensurePublishedEditionResultsForEdition(
        {
          id: "ed-open",
          status: "open",
          freezeStatus: "idle",
          opensAt: null,
          closesAt: null,
          publishesAt: null,
        },
        db as never,
      ),
    ).resolves.toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });
});
