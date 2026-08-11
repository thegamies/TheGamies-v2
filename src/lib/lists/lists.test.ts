import { describe, expect, it } from "vitest";
import { canEditList, ownsListByProfile } from "./ownership";
import {
  createDraftSchema,
  replaceItemsSchema,
  LIST_MAX_ITEMS,
} from "./schema";
import {
  editSecretMatches,
  generateEditSecret,
  hashEditSecret,
} from "./secrets";
import {
  gotyEligibilityError,
  gotySlugForYear,
  normalizeRanks,
  slugifyListTitle,
} from "./rules";
import { pointsForRank } from "./scoring";
import { parseListEditCookie, encodeListEditCookie } from "./cookies";

describe("pointsForRank", () => {
  it("scores top 10 only", () => {
    expect(pointsForRank(1)).toBe(10);
    expect(pointsForRank(10)).toBe(1);
    expect(pointsForRank(11)).toBe(0);
    expect(pointsForRank(0)).toBe(0);
  });
});

describe("normalizeRanks", () => {
  it("makes ranks contiguous by sort order", () => {
    expect(
      normalizeRanks([
        { gameId: "b", rank: 5 },
        { gameId: "a", rank: 2 },
      ]),
    ).toEqual([
      { gameId: "a", rank: 1 },
      { gameId: "b", rank: 2 },
    ]);
  });
});

describe("gotyEligibilityError", () => {
  const base = {
    id: "g1",
    year: 2026,
    firstReleaseDate: new Date("2026-03-01"),
    versionParentIgdbId: null,
    isAdult: false,
  };

  it("accepts a matching released game", () => {
    expect(gotyEligibilityError(base, 2026, new Date("2026-08-01"))).toBeNull();
  });

  it("rejects wrong year, editions, adult, and upcoming", () => {
    expect(gotyEligibilityError({ ...base, year: 2025 }, 2026)).toMatch(/2026/);
    expect(
      gotyEligibilityError({ ...base, versionParentIgdbId: 99 }, 2026),
    ).toMatch(/Edition/);
    expect(gotyEligibilityError({ ...base, isAdult: true }, 2026)).toMatch(
      /Adult/,
    );
    expect(
      gotyEligibilityError(
        { ...base, firstReleaseDate: new Date("2026-12-01") },
        2026,
        new Date("2026-08-01"),
      ),
    ).toMatch(/Upcoming/);
  });
});

describe("slugs", () => {
  it("builds goty and custom slugs", () => {
    expect(gotySlugForYear(2026)).toBe("goty-2026");
    expect(slugifyListTitle(" My Cool List! ")).toBe("my-cool-list");
  });
});

describe("createDraftSchema", () => {
  it("requires year for goty and title for custom", () => {
    expect(
      createDraftSchema.safeParse({ listType: "goty", year: 2026 }).success,
    ).toBe(true);
    expect(
      createDraftSchema.safeParse({ listType: "goty" }).success,
    ).toBe(false);
    expect(
      createDraftSchema.safeParse({
        listType: "custom",
        title: "Favorites",
      }).success,
    ).toBe(true);
    expect(
      createDraftSchema.safeParse({ listType: "custom" }).success,
    ).toBe(false);
  });
});

describe("replaceItemsSchema", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const id2 = "22222222-2222-4222-8222-222222222222";

  it("rejects duplicate games or ranks and oversize lists", () => {
    expect(
      replaceItemsSchema.safeParse([
        { gameId: id, rank: 1 },
        { gameId: id, rank: 2 },
      ]).success,
    ).toBe(false);
    expect(
      replaceItemsSchema.safeParse([
        { gameId: id, rank: 1 },
        { gameId: id2, rank: 1 },
      ]).success,
    ).toBe(false);
    expect(
      replaceItemsSchema.safeParse(
        Array.from({ length: LIST_MAX_ITEMS + 1 }, (_, i) => ({
          gameId: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
          rank: i + 1,
        })),
      ).success,
    ).toBe(false);
  });
});

describe("edit secrets and ownership", () => {
  it("hashes and matches secrets", () => {
    const secret = generateEditSecret();
    const hash = hashEditSecret(secret);
    expect(editSecretMatches(secret, hash)).toBe(true);
    expect(editSecretMatches("wrong", hash)).toBe(false);
  });

  it("allows profile or edit-secret owners", () => {
    const secret = generateEditSecret();
    const list = {
      profileId: "p1",
      editSecretHash: hashEditSecret(secret),
    };
    expect(ownsListByProfile(list, "p1")).toBe(true);
    expect(canEditList(list, { profileId: "p1" })).toBe(true);
    expect(canEditList({ ...list, profileId: null }, { editSecret: secret })).toBe(
      true,
    );
    expect(canEditList(list, { profileId: "other", editSecret: "nope" })).toBe(
      false,
    );
  });
});

describe("list edit cookie encoding", () => {
  it("round-trips publicId and secret", () => {
    const encoded = encodeListEditCookie({
      publicId: "abc123",
      secret: "sekrit",
    });
    expect(parseListEditCookie(encoded)).toEqual({
      publicId: "abc123",
      secret: "sekrit",
    });
    expect(parseListEditCookie("bad")).toBeNull();
  });
});

describe("claim conflict helper", () => {
  it("treats another owned GOTY year as a conflict signal via ownership rules", () => {
    // Pure helper: claim conflict is enforced in service with DB uniqueness;
    // ownership still blocks unrelated profiles.
    const claimed = {
      profileId: "owner",
      editSecretHash: null as string | null,
    };
    expect(canEditList(claimed, { profileId: "other" })).toBe(false);
    expect(canEditList(claimed, { profileId: "owner" })).toBe(true);
  });
});
