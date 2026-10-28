import { describe, expect, it } from "vitest";
import { isUndeliverableEmailAddress } from "@/lib/email/send";
import { parseOwnedUsername } from "@/lib/profile/username";
import { isEditionResultsEntranceOpen } from "@/lib/communities/edition-results-entrance";
import { computeEditionStatus } from "@/lib/communities/edition-status";
import { slugifyCommunityName } from "@/lib/communities/schema";
import { QA_COMMUNITIES } from "@/lib/qa/staging-fixtures";
import {
  LOADTEST_EDITION_HOSTS,
  LOADTEST_EDITION_SEED_BALLOTS,
  LOADTEST_COMMUNITY,
  LOADTEST_TGA_YEAR,
  completeLoadtestTgaPicks,
  resolveLoadtestScenario,
  LOADTEST_WRITERS_MAX,
  assertLoadtestFixturesSafe,
  isLoadtestEmail,
  isLoadtestSignUpEmail,
  loadtestAccount,
  loadtestAccountsValidThrough,
  loadtestSignUpEmail,
  loadtestSyntheticAuthUserId,
  parseLoadtestWriterHeader,
  loadtestEditionOpenSchedule,
  loadtestEditionPublishedSchedule,
  loadtestEditionSeedBatches,
  loadtestTgaLockedSchedule,
  loadtestTgaOpenSchedule,
  parseWriterCount,
  mergeLoadtestGameBands,
  pickLoadtestGame,
  pickLoadtestGames,
  pickLoadtestShareList,
  LOADTEST_SHARE_LIST_SLUG,
  LOADTEST_SHARE_LIST_TITLE,
} from "./loadtest";
import { slugifyListTitle } from "@/lib/lists/rules";

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
    expect(LOADTEST_COMMUNITY.joinsClosed).toBe(true);
    expect(
      assertLoadtestFixturesSafe({ communitySlug: QA_COMMUNITIES.showcase.slug }),
    ).toMatch(/showcase/);
    expect(
      assertLoadtestFixturesSafe({ communitySlug: LOADTEST_COMMUNITY.slug }),
    ).toBeNull();
  });

  it("names a writer from the header and not from a login", () => {
    expect(parseLoadtestWriterHeader("7")).toBe(7);
    expect(parseLoadtestWriterHeader("0")).toBeNull();
    expect(parseLoadtestWriterHeader("101")).toBeNull();
    expect(parseLoadtestWriterHeader(null)).toBeNull();
    expect(loadtestSyntheticAuthUserId(1)).toBe("seed:loadtest:gamies_qa_load_001");
  });

  it("builds undeliverable Auth stress sign-up emails", () => {
    const email = loadtestSignUpEmail({ runId: "run-1", vu: 2, seq: 7 });
    expect(email).toBe("thegamies-qa-load-su-run-1-002-00007@example.com");
    expect(isLoadtestSignUpEmail(email)).toBe(true);
    expect(isLoadtestSignUpEmail("ada@gmail.com")).toBe(false);
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
    expect(LOADTEST_TGA_YEAR).toBe(2025);
  });
});

describe("completeLoadtestTgaPicks", () => {
  const slate = [
    { id: "goty", nomineeIds: ["a", "b", "c"] },
    { id: "indie", nomineeIds: ["x"] },
  ];

  it("fills every category and rotates nominees by writer", () => {
    expect(completeLoadtestTgaPicks(slate, 0)).toEqual({
      goty: "a",
      indie: "x",
    });
    expect(completeLoadtestTgaPicks(slate, 1)).toEqual({
      goty: "b",
      indie: "x",
    });
    expect(completeLoadtestTgaPicks(slate, 3)).toEqual({
      goty: "a",
      indie: "x",
    });
  });
});

describe("resolveLoadtestScenario", () => {
  it("maps the old open/locked names onto pickem", () => {
    expect(resolveLoadtestScenario("pickem-open")).toBe("pickem");
    expect(resolveLoadtestScenario("pickem-locked")).toBe("pickem");
    expect(resolveLoadtestScenario("pickem")).toBe("pickem");
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

describe("loadtest share lists", () => {
  it("keeps the planted slug aligned with the title", () => {
    expect(slugifyListTitle(LOADTEST_SHARE_LIST_TITLE)).toBe(
      LOADTEST_SHARE_LIST_SLUG,
    );
  });

  it("picks from the whole planted group", () => {
    const lists = [
      { username: "gamies_qa_load_001", slug: "load-share", publicId: "a" },
      { username: "gamies_qa_load_002", slug: "load-share", publicId: "b" },
    ];
    expect(pickLoadtestShareList(lists, () => 0).publicId).toBe("a");
    expect(pickLoadtestShareList(lists, () => 0.99).publicId).toBe("b");
  });
});

describe("loadtest schedules", () => {
  const now = new Date("2026-10-09T17:00:00.000Z");

  it("keeps the 2025 edition open until the load run publishes it", () => {
    const schedule = loadtestEditionOpenSchedule(now);
    expect(schedule.opensAt.getTime()).toBeLessThan(now.getTime());
    expect(schedule.closesAt.getTime()).toBeGreaterThan(now.getTime());
    expect(schedule.publishesAt.getTime()).toBeGreaterThan(
      schedule.closesAt.getTime(),
    );
  });

  it("leaves the edition published with the results board as the public page", () => {
    const schedule = loadtestEditionPublishedSchedule(now);
    expect(computeEditionStatus(schedule, now)).toBe("published");
    expect(isEditionResultsEntranceOpen(schedule.publishesAt, now)).toBe(
      false,
    );
    expect(schedule.opensAt.getTime()).toBeLessThan(schedule.closesAt.getTime());
    expect(schedule.closesAt.getTime()).toBeLessThanOrEqual(
      schedule.publishesAt.getTime(),
    );
  });

  it("splits 1000 ballots into batches of 50, with hosts only in the first", () => {
    const batches = loadtestEditionSeedBatches();
    expect(batches).toHaveLength(20);
    expect(batches[0]).toEqual({ startIndex: 1, count: 50 });
    expect(batches[19]).toEqual({ startIndex: 951, count: 50 });
    expect(batches.reduce((sum, batch) => sum + batch.count, 0)).toBe(
      LOADTEST_EDITION_SEED_BALLOTS,
    );
    expect(LOADTEST_EDITION_HOSTS).toBe(3);
  });

  it("maps the old edition scenario names onto editions", () => {
    expect(resolveLoadtestScenario("editions-filling")).toBe("editions");
    expect(resolveLoadtestScenario("editions-results")).toBe("editions");
  });
});
