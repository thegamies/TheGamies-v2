import { describe, expect, it, vi } from "vitest";
import type { Db } from "@thegamies/db";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return {
    ...actual,
    resolveAdultFilters: vi.fn(async () => ({
      eroticThemeId: null,
      erogeKeywordId: null,
    })),
  };
});

vi.mock("./upsert-games", () => ({
  upsertGamesWithLinks: vi.fn(async () => 1),
}));

import { applyWebhook } from "./webhook-apply";
import { upsertGamesWithLinks } from "./upsert-games";

describe("applyWebhook games create/update", () => {
  it("does not issue a separate igdb_removed_at update after upsert", async () => {
    const update = vi.fn();
    const db = { update } as unknown as Db;
    await applyWebhook(db, "games", "update", {
      id: 10,
      name: "Test Game",
      slug: "test-game",
    });
    expect(upsertGamesWithLinks).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });
});
