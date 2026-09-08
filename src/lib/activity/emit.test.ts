import { describe, expect, it } from "vitest";
import { gotyMembershipEventRows, shouldEmitListReveal } from "./emit";

const goty = {
  id: "list-1",
  profileId: "p1",
  listType: "goty" as const,
  rankVisibility: "ranked",
};

describe("gotyMembershipEventRows", () => {
  it("emits add and remove with one batch id", () => {
    const rows = gotyMembershipEventRows(goty, ["a"], ["b"], "batch-1");
    expect(rows).toEqual([
      {
        profileId: "p1",
        kind: "list_add",
        batchId: "batch-1",
        gameId: "b",
        listId: "list-1",
      },
      {
        profileId: "p1",
        kind: "list_remove",
        batchId: "batch-1",
        gameId: "a",
        listId: "list-1",
      },
    ]);
  });

  it("skips custom lists, hidden lists, and rank-only saves", () => {
    expect(
      gotyMembershipEventRows(
        { ...goty, listType: "custom" },
        ["a"],
        ["b"],
        "b",
      ),
    ).toEqual([]);
    expect(
      gotyMembershipEventRows(
        { ...goty, rankVisibility: "hidden" },
        ["a"],
        ["b"],
        "b",
      ),
    ).toEqual([]);
    expect(gotyMembershipEventRows(goty, ["a", "b"], ["b", "a"], "b")).toEqual(
      [],
    );
  });

  it("still emits while games_only", () => {
    expect(
      gotyMembershipEventRows(
        { ...goty, rankVisibility: "games_only" },
        [],
        ["a"],
        "b",
      ),
    ).toHaveLength(1);
  });
});

describe("shouldEmitListReveal", () => {
  it("fires when a GOTY list becomes ranked", () => {
    expect(
      shouldEmitListReveal({
        listType: "goty",
        profileId: "p1",
        previous: "hidden",
        next: "ranked",
      }),
    ).toBe(true);
    expect(
      shouldEmitListReveal({
        listType: "goty",
        profileId: "p1",
        previous: "games_only",
        next: "ranked",
      }),
    ).toBe(true);
  });

  it("does not fire for custom lists or staying unranked", () => {
    expect(
      shouldEmitListReveal({
        listType: "custom",
        profileId: "p1",
        previous: "hidden",
        next: "ranked",
      }),
    ).toBe(false);
    expect(
      shouldEmitListReveal({
        listType: "goty",
        profileId: "p1",
        previous: "hidden",
        next: "games_only",
      }),
    ).toBe(false);
    expect(
      shouldEmitListReveal({
        listType: "goty",
        profileId: "p1",
        previous: "ranked",
        next: "ranked",
      }),
    ).toBe(false);
  });
});
