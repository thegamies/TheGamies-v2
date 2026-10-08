import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCommunityBySlug: vi.fn(),
  listEditionsForCommunity: vi.fn(),
  ensurePublishedEditionResultsForEdition: vi.fn(),
  getEditionGotyThroughRank: vi.fn(),
  getEditionCategoryResults: vi.fn(),
}));

vi.mock("./service", () => ({
  getCommunityBySlug: mocks.getCommunityBySlug,
}));

vi.mock("./editions", async () => {
  const actual = await vi.importActual<typeof import("./editions")>("./editions");
  return {
    ...actual,
    listEditionsForCommunity: mocks.listEditionsForCommunity,
  };
});

vi.mock("./edition-results", () => ({
  CATEGORY_RANKED_TOP: 3,
  ensurePublishedEditionResultsForEdition:
    mocks.ensurePublishedEditionResultsForEdition,
  getEditionGotyThroughRank: mocks.getEditionGotyThroughRank,
  getEditionCategoryResults: mocks.getEditionCategoryResults,
}));

import {
  loadEditionResultsOverview,
  loadEditionYearContext,
  loadPublishedEditionMeta,
} from "./edition-year-load";
import type { CommunityEditionPublic } from "./editions";

const community = {
  id: "comm-1",
  slug: "showcase",
  name: "Showcase",
};

const edition2025: CommunityEditionPublic = {
  id: "ed-2025",
  communityId: "comm-1",
  year: 2025,
  opensAt: null,
  closesAt: null,
  publishesAt: null,
  rankMode: "dense",
  freezeStatus: "ready",
  freezeStartedAt: null,
  freezeError: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  status: "published",
};

const edition2026: CommunityEditionPublic = {
  ...edition2025,
  id: "ed-2026",
  year: 2026,
  status: "open",
  freezeStatus: "idle",
};

const meta = {
  frozenAt: new Date("2026-01-02T00:00:00.000Z"),
  ballotCountCommunity: 12,
  ballotCountVoices: 2,
  gotyTotalCommunity: 40,
  gotyTotalVoices: 8,
};

describe("loadEditionYearContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads community and the year list once, then picks the year in memory", async () => {
    mocks.getCommunityBySlug.mockResolvedValue(community);
    mocks.listEditionsForCommunity.mockResolvedValue([
      edition2026,
      edition2025,
    ]);

    const ctx = await loadEditionYearContext("showcase", 2025, "viewer-1");

    expect(mocks.getCommunityBySlug).toHaveBeenCalledTimes(1);
    expect(mocks.getCommunityBySlug).toHaveBeenCalledWith(
      "showcase",
      "viewer-1",
    );
    expect(mocks.listEditionsForCommunity).toHaveBeenCalledTimes(1);
    expect(mocks.listEditionsForCommunity).toHaveBeenCalledWith("comm-1");
    expect(ctx?.edition?.id).toBe("ed-2025");
    expect(ctx?.editions).toHaveLength(2);
  });

  it("returns null when the community is missing", async () => {
    mocks.getCommunityBySlug.mockResolvedValue(null);
    await expect(
      loadEditionYearContext("missing", 2025),
    ).resolves.toBeNull();
    expect(mocks.listEditionsForCommunity).not.toHaveBeenCalled();
  });
});

describe("loadPublishedEditionMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reuses the page edition instead of looking up the year again", async () => {
    mocks.ensurePublishedEditionResultsForEdition.mockResolvedValue(meta);
    await expect(loadPublishedEditionMeta(edition2025)).resolves.toEqual(meta);
    expect(mocks.ensurePublishedEditionResultsForEdition).toHaveBeenCalledTimes(
      1,
    );
    expect(mocks.ensurePublishedEditionResultsForEdition).toHaveBeenCalledWith(
      edition2025,
    );
  });
});

describe("loadEditionResultsOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEditionGotyThroughRank.mockResolvedValue([]);
    mocks.getEditionCategoryResults.mockResolvedValue([]);
  });

  it("does not re-ensure freeze when meta is already in hand", async () => {
    const loaded = await loadEditionResultsOverview({
      edition: edition2025,
      mode: "combined",
      rankMode: "dense",
      meta,
    });

    expect(loaded?.meta).toEqual(meta);
    expect(
      mocks.ensurePublishedEditionResultsForEdition,
    ).not.toHaveBeenCalled();
    expect(mocks.getEditionGotyThroughRank).toHaveBeenCalledTimes(1);
    expect(mocks.getEditionCategoryResults).toHaveBeenCalledTimes(1);
    expect(mocks.getEditionCategoryResults).toHaveBeenCalledWith(
      "ed-2025",
      "combined",
      expect.objectContaining({
        maxRank: 3,
        skipCustomBackfill: true,
      }),
    );
  });

  it("ensures freeze once when the page has not loaded meta yet", async () => {
    mocks.ensurePublishedEditionResultsForEdition.mockResolvedValue(meta);
    await loadEditionResultsOverview({
      edition: edition2025,
      mode: "community",
      rankMode: "competition",
    });
    expect(mocks.ensurePublishedEditionResultsForEdition).toHaveBeenCalledTimes(
      1,
    );
  });
});
