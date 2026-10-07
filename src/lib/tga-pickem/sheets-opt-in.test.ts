import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTgaYear, isCommunityTgaOptedIn, listTgaBallot } = vi.hoisted(() => ({
  getTgaYear: vi.fn(),
  isCommunityTgaOptedIn: vi.fn(),
  listTgaBallot: vi.fn(),
}));

vi.mock("./service", () => ({ getTgaYear, isCommunityTgaOptedIn, listTgaBallot }));
vi.mock("./status", () => ({ picksAreOpen: () => true }));

import {
  COMMUNITY_TGA_NOT_RUNNING,
  importSiteSheetToCommunity,
  saveCommunitySheet,
} from "./sheets";

function fakeDb(siteSheet?: { worldPremieresGuess: number }) {
  const insert = vi.fn(() => ({
    values: () => ({ onConflictDoUpdate: () => Promise.resolve() }),
  }));
  const del = vi.fn(() => ({ where: () => Promise.resolve() }));
  const select = vi.fn(() => ({
    from: () => ({
      where: () => Promise.resolve(siteSheet ? [siteSheet] : []),
    }),
  }));
  return { db: { insert, delete: del, select } as never, insert, del };
}

beforeEach(() => {
  getTgaYear.mockReset().mockResolvedValue({ year: 2026 });
  isCommunityTgaOptedIn.mockReset();
  listTgaBallot.mockReset().mockResolvedValue([]);
});

describe("community Pick'em sheets require the community opt-in", () => {
  it("refuses to save when the community has not opted in for the year", async () => {
    isCommunityTgaOptedIn.mockResolvedValue(false);
    const { db, insert, del } = fakeDb();
    await expect(
      saveCommunitySheet("c1", "p1", 2026, { worldPremieresGuess: 3, picks: {} }, db),
    ).resolves.toEqual({ error: COMMUNITY_TGA_NOT_RUNNING });
    expect(isCommunityTgaOptedIn).toHaveBeenCalledWith("c1", 2026, db);
    expect(insert).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("refuses an import when the community has not opted in", async () => {
    isCommunityTgaOptedIn.mockResolvedValue(false);
    const { db, insert } = fakeDb({ worldPremieresGuess: 2 });
    const result = await importSiteSheetToCommunity("c1", "p1", 2026, db);
    expect(result).toEqual({ error: COMMUNITY_TGA_NOT_RUNNING });
    expect(insert).not.toHaveBeenCalled();
  });

  it("saves when the community has opted in", async () => {
    isCommunityTgaOptedIn.mockResolvedValue(true);
    const { db, insert } = fakeDb();
    await expect(
      saveCommunitySheet("c1", "p1", 2026, { worldPremieresGuess: 3, picks: {} }, db),
    ).resolves.toEqual({ ok: true });
    expect(insert).toHaveBeenCalledOnce();
  });
});
