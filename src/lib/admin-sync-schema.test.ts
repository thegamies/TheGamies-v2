import { describe, expect, it } from "vitest";
import { adminSyncBodySchema } from "./admin-sync-schema";

describe("adminSyncBodySchema", () => {
  it("accepts year-scoped enrich", () => {
    const parsed = adminSyncBodySchema.parse({
      action: "enrich",
      entity: "covers",
      year: 2026,
    });
    expect(parsed).toEqual({
      action: "enrich",
      entity: "covers",
      year: 2026,
    });
  });

  it("allows enrich without year (all years)", () => {
    const parsed = adminSyncBodySchema.parse({
      action: "enrich",
      entity: "all",
    });
    expect(parsed.year).toBeUndefined();
  });

  it("accepts media enrich entities", () => {
    expect(
      adminSyncBodySchema.parse({
        action: "enrich",
        entity: "screenshots",
      }).entity,
    ).toBe("screenshots");
    expect(
      adminSyncBodySchema.parse({
        action: "enrich",
        entity: "image_types",
      }).entity,
    ).toBe("image_types");
    expect(
      adminSyncBodySchema.parse({
        action: "enrich",
        entity: "artworks",
      }).entity,
    ).toBe("artworks");
    expect(
      adminSyncBodySchema.parse({
        action: "enrich",
        entity: "game_videos",
      }).entity,
    ).toBe("game_videos");
  });

  it("rejects unknown actions and entities", () => {
    expect(() =>
      adminSyncBodySchema.parse({ action: "wipe" }),
    ).toThrow();
    expect(() =>
      adminSyncBodySchema.parse({
        action: "enrich",
        entity: "artwork_types",
      }),
    ).toThrow();
  });

  it("accepts catalog and updated walks", () => {
    expect(
      adminSyncBodySchema.parse({
        action: "catalog",
        entity: "games",
        reset: true,
        afterId: 0,
      }).action,
    ).toBe("catalog");
    expect(
      adminSyncBodySchema.parse({
        action: "updated",
        entity: "all",
        sinceUnix: 1_700_000_000,
      }).sinceUnix,
    ).toBe(1_700_000_000);
  });

  it("requires positive maxPages when set", () => {
    expect(() =>
      adminSyncBodySchema.parse({
        action: "backfill",
        maxPages: 0,
      }),
    ).toThrow();
  });
});
