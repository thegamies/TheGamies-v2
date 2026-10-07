import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createDb } = vi.hoisted(() => ({ createDb: vi.fn() }));

vi.mock("@thegamies/db", () => ({
  createDb,
  profiles: {},
}));

import { SITE_OPS_CLAIM_FAILED_MESSAGE } from "@/lib/site-ops/rules";
import { claimFirstSiteAdmin, searchProfilesForSiteOps } from "./service";

describe("searchProfilesForSiteOps", () => {
  it("returns no hits for a blank query without dumping profiles", async () => {
    await expect(searchProfilesForSiteOps("   ")).resolves.toEqual([]);
    await expect(searchProfilesForSiteOps("")).resolves.toEqual([]);
  });
});

describe("claimFirstSiteAdmin", () => {
  beforeEach(() => {
    createDb.mockReset();
    vi.stubEnv("ADMIN_SYNC_SECRET", "s3cret-value");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a wrong secret without touching the database", async () => {
    for (const secret of ["", "s3cret", "s3cret-valuE", "s3cret-value-extra"]) {
      await expect(
        claimFirstSiteAdmin({ profileId: "p1", secret }),
      ).resolves.toEqual({ error: SITE_OPS_CLAIM_FAILED_MESSAGE });
    }
    expect(createDb).not.toHaveBeenCalled();
  });

  it("rejects everything when the secret is not configured", async () => {
    vi.stubEnv("ADMIN_SYNC_SECRET", "");
    await expect(
      claimFirstSiteAdmin({ profileId: "p1", secret: "" }),
    ).resolves.toEqual({ error: SITE_OPS_CLAIM_FAILED_MESSAGE });
    expect(createDb).not.toHaveBeenCalled();
  });

  it("claims with the matching secret", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "p1" }]);
    createDb.mockReturnValue({
      update: () => ({ set: () => ({ where: () => ({ returning }) }) }),
    });
    await expect(
      claimFirstSiteAdmin({ profileId: "p1", secret: "s3cret-value" }),
    ).resolves.toEqual({ ok: true });
    expect(returning).toHaveBeenCalledOnce();
  });
});
