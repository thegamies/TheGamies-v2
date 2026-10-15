import { beforeEach, describe, expect, it, vi } from "vitest";
import { tgaCommunityScores, tgaSiteScores } from "@thegamies/db";

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
  saveSiteSheet,
} from "./sheets";

type Inserted = {
  table: unknown;
  values: Record<string, unknown>;
  conflictSet: Record<string, unknown> | null;
};

function fakeDb(siteSheet?: { worldPremieresGuess: number }) {
  const inserted: Inserted[] = [];
  const insert = vi.fn((table: unknown) => ({
    values: (values: Record<string, unknown>) => {
      const entry: Inserted = { table, values, conflictSet: null };
      inserted.push(entry);
      return {
        onConflictDoUpdate: (conflict: { set: Record<string, unknown> }) => {
          entry.conflictSet = conflict.set;
          return Promise.resolve();
        },
      };
    },
  }));
  const del = vi.fn(() => ({ where: () => Promise.resolve() }));
  const select = vi.fn(() => ({
    from: () => ({
      where: () => Promise.resolve(siteSheet ? [siteSheet] : []),
    }),
  }));
  return { db: { insert, delete: del, select } as never, insert, del, inserted };
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
    const { db, insert, inserted } = fakeDb();
    await expect(
      saveCommunitySheet("c1", "p1", 2026, { worldPremieresGuess: 3, picks: {} }, db),
    ).resolves.toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(2);
    const score = inserted.find((row) => row.table === tgaCommunityScores);
    expect(score?.values).toMatchObject({
      communityId: "c1",
      profileId: "p1",
      year: 2026,
      points: 0,
      wpDelta: null,
    });
    expect(score?.conflictSet).not.toHaveProperty("points");
    expect(score?.conflictSet?.wpDelta).toBeNull();
  });

  it("stores the World Premieres delta when the official count is already set", async () => {
    getTgaYear.mockResolvedValue({ year: 2026, worldPremieresOfficial: 10 });
    isCommunityTgaOptedIn.mockResolvedValue(true);
    const { db, inserted } = fakeDb();
    await saveCommunitySheet("c1", "p1", 2026, { worldPremieresGuess: 3, picks: {} }, db);
    const score = inserted.find((row) => row.table === tgaCommunityScores);
    expect(score?.values.wpDelta).toBe(7);
    expect(score?.conflictSet?.wpDelta).toBe(7);
    expect(score?.conflictSet).not.toHaveProperty("points");
  });
});

describe("site Pick'em save writes a score row", () => {
  it("inserts 0 points and leaves points alone on a repeat save", async () => {
    getTgaYear.mockResolvedValue({ year: 2026, worldPremieresOfficial: 4 });
    const { db, inserted } = fakeDb();
    await expect(
      saveSiteSheet("p1", 2026, { worldPremieresGuess: 6, picks: {} }, db),
    ).resolves.toEqual({ ok: true });
    const score = inserted.find((row) => row.table === tgaSiteScores);
    expect(score?.values).toMatchObject({
      profileId: "p1",
      year: 2026,
      points: 0,
      wpDelta: 2,
    });
    expect(score?.conflictSet).not.toHaveProperty("points");
    expect(score?.conflictSet?.wpDelta).toBe(2);
  });
});
