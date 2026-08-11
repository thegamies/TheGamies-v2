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

  it("rejects unknown actions and entities", () => {
    expect(() =>
      adminSyncBodySchema.parse({ action: "wipe" }),
    ).toThrow();
    expect(() =>
      adminSyncBodySchema.parse({
        action: "enrich",
        entity: "screenshots",
      }),
    ).toThrow();
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
