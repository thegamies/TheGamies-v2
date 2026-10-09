import { describe, expect, it } from "vitest";
import { isUndeliverableEmailAddress } from "@/lib/email/send";
import { parseOwnedUsername } from "@/lib/profile/username";
import { slugifyCommunityName } from "@/lib/communities/schema";
import { QA_COMMUNITIES } from "@/lib/qa/staging-fixtures";
import {
  LOADTEST_COMMUNITY,
  LOADTEST_TGA_LOCKED_YEAR,
  LOADTEST_TGA_OPEN_YEAR,
  LOADTEST_WRITERS_MAX,
  assertLoadtestFixturesSafe,
  isLoadtestEmail,
  loadtestAccount,
  loadtestAccountsValidThrough,
  loadtestEditionOpenSchedule,
  loadtestTgaLockedSchedule,
  loadtestTgaOpenSchedule,
  parseWriterCount,
  mergeLoadtestGameBands,
  pickLoadtestGame,
  pickLoadtestGames,
} from "./loadtest";

describe("loadtest identities", () => {
  it("uses undeliverable emails and valid usernames through the writer cap", () => {
    expect(loadtestAccountsValidThrough(LOADTEST_WRITERS_MAX)).toBe(true);
    const first = loadtestAccount(1);
    const last = loadtestAccount(100);
    expect(isUndeliverableEmailAddress(first.email)).toBe(true);
    expect(isLoadtestEmail(first.email)).toBe(true);
    expect(parseOwnedUsername(first.username)).toEqual({
      username: first.username,
    });
    expect(parseOwnedUsername(last.username)).toEqual({
      username: last.username,
    });
  });

  it("does not collide with the QA showcase slug", () => {
    expect(slugifyCommunityName(LOADTEST_COMMUNITY.name)).toBe(
      LOADTEST_COMMUNITY.slug,
    );
    expect(LOADTEST_COMMUNITY.slug).not.toBe(QA_COMMUNITIES.showcase.slug);
    expect(
      assertLoadtestFixturesSafe({ communitySlug: QA_COMMUNITIES.showcase.slug }),
    ).toMatch(/showcase/);
    expect(
      assertLoadtestFixturesSafe({ communitySlug: LOADTEST_COMMUNITY.slug }),
    ).toBeNull();
  });

  it("caps writers at 100", () => {
    expect(parseWriterCount(0)).toBe(0);
    expect(parseWriterCount(50)).toBe(50);
    expect(parseWriterCount(100)).toBe(100);
    expect(parseWriterCount(101)).toHaveProperty("error");
    expect(parseWriterCount(-1)).toHaveProperty("error");
  });
});

describe("loadtest schedules", () => {
  const now = new Date("2026-10-09T17:00:00.000Z");

  it("keeps the open TGA year before show start", () => {
    const open = loadtestTgaOpenSchedule(now);
    expect(open.opensAt.getTime()).toBeLessThan(now.getTime());
    expect(open.showStartsAt.getTime()).toBeGreaterThan(now.getTime());
    const locked = loadtestTgaLockedSchedule(now);
    expect(locked.showStartsAt.getTime()).toBeLessThan(now.getTime());
    expect(LOADTEST_TGA_OPEN_YEAR).not.toBe(LOADTEST_TGA_LOCKED_YEAR);
  });
});

describe("loadtest game pool", () => {
  const popular = [
    { id: "p1", slug: "had", igdbId: 1 },
    { id: "p2", slug: "zel", igdbId: 2 },
  ];
  const unpopular = [{ id: "u1", slug: "obscure", igdbId: 9 }];

  it("tags bands and drops unpopular ids already in popular", () => {
    const pool = mergeLoadtestGameBands(popular, [
      ...unpopular,
      { id: "p1", slug: "had", igdbId: 1 },
    ]);
    expect(pool.filter((row) => row.band === "popular")).toHaveLength(2);
    expect(pool.filter((row) => row.band === "unpopular")).toEqual([
      { id: "u1", slug: "obscure", igdbId: 9, band: "unpopular" },
    ]);
  });

  it("picks popular about 80% of the time", () => {
    const pool = mergeLoadtestGameBands(popular, unpopular);
    let popularHits = 0;
    for (let i = 0; i < 100; i++) {
      const draw = pickLoadtestGame(pool, () => (i < 80 ? 0.1 : 0.9));
      if (draw.band === "popular") popularHits += 1;
    }
    expect(popularHits).toBe(80);
  });

  it("fills a list without duplicate ids", () => {
    const pool = mergeLoadtestGameBands(popular, unpopular);
    const picked = pickLoadtestGames(pool, 3, () => 0.5);
    expect(new Set(picked.map((row) => row.id)).size).toBe(3);
  });
});

describe("loadtest schedules", () => {
  const now = new Date("2026-10-09T17:00:00.000Z");

  it("keeps the filling edition open", () => {
    const schedule = loadtestEditionOpenSchedule(now);
    expect(schedule.opensAt.getTime()).toBeLessThan(now.getTime());
    expect(schedule.closesAt.getTime()).toBeGreaterThan(now.getTime());
    expect(schedule.publishesAt.getTime()).toBeGreaterThan(
      schedule.closesAt.getTime(),
    );
  });
});
