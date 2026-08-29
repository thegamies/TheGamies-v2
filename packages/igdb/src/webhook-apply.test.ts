import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { applyGameCreateUpdates, applyWebhook } from "./webhook-apply";
import { upsertGamesWithLinks } from "./upsert-games";

describe("applyWebhook games create/update", () => {
  beforeEach(() => {
    vi.mocked(upsertGamesWithLinks).mockClear();
  });

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

  it("maps several game payloads into one catalog upsert", async () => {
    const db = {} as unknown as Db;
    await applyGameCreateUpdates(db, [
      { id: 1, name: "Alpha" },
      { id: 2, name: "Beta" },
    ]);
    expect(upsertGamesWithLinks).toHaveBeenCalledTimes(1);
    expect(upsertGamesWithLinks).toHaveBeenCalledWith(db, [
      expect.objectContaining({ igdbId: 1, title: "Alpha" }),
      expect.objectContaining({ igdbId: 2, title: "Beta" }),
    ]);
  });
});
