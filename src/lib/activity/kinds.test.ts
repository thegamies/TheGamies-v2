import { describe, expect, it } from "vitest";
import {
  formatFollowLibraryCounts,
  libraryEventKindForStatus,
  parseActivityKind,
  parseLibraryStatus,
  parseLibraryVisibility,
  parseListRankVisibility,
  isTrendingKind,
} from "./kinds";

describe("library parsers", () => {
  it("accepts the six statuses, including renamed want and played", () => {
    expect(parseLibraryStatus("wishlist")).toBe("wishlist");
    expect(parseLibraryStatus("backlog")).toBe("backlog");
    expect(parseLibraryStatus("playing")).toBe("playing");
    expect(parseLibraryStatus("paused")).toBe("paused");
    expect(parseLibraryStatus("beat")).toBe("beat");
    expect(parseLibraryStatus("dropped")).toBe("dropped");
    expect(parseLibraryStatus("want")).toBe("backlog");
    expect(parseLibraryStatus("played")).toBe("beat");
    expect(parseLibraryStatus("owned")).toBeNull();
    expect(parseLibraryVisibility("private")).toBe("private");
    expect(parseLibraryVisibility("nope")).toBe("public");
  });

  it("maps status to event kinds", () => {
    expect(libraryEventKindForStatus("wishlist")).toBe("library_wishlist");
    expect(libraryEventKindForStatus("backlog")).toBe("library_backlog");
    expect(libraryEventKindForStatus("playing")).toBe("library_playing");
    expect(libraryEventKindForStatus("paused")).toBe("library_paused");
    expect(libraryEventKindForStatus("beat")).toBe("library_beat");
    expect(libraryEventKindForStatus("dropped")).toBe("library_dropped");
    expect(parseActivityKind("library_want")).toBe("library_backlog");
    expect(parseActivityKind("library_played")).toBe("library_beat");
  });
});

describe("rank visibility", () => {
  it("defaults unknown values to ranked", () => {
    expect(parseListRankVisibility("games_only")).toBe("games_only");
    expect(parseListRankVisibility("hidden")).toBe("hidden");
    expect(parseListRankVisibility("nope")).toBe("ranked");
  });
});

describe("trending kinds", () => {
  it("counts wishlist backlog playing beat and list add, not paused or dropped", () => {
    expect(isTrendingKind("library_wishlist")).toBe(true);
    expect(isTrendingKind("library_backlog")).toBe(true);
    expect(isTrendingKind("library_playing")).toBe(true);
    expect(isTrendingKind("library_beat")).toBe(true);
    expect(isTrendingKind("list_add")).toBe(true);
    expect(isTrendingKind("library_paused")).toBe(false);
    expect(isTrendingKind("library_dropped")).toBe(false);
    expect(isTrendingKind("list_remove")).toBe(false);
  });
});

describe("formatFollowLibraryCounts", () => {
  it("omits empty statuses and uses the public labels", () => {
    expect(formatFollowLibraryCounts({ playing: 2, beat: 1 })).toBe(
      "People you follow: 2 playing · 1 beat",
    );
    expect(formatFollowLibraryCounts({ wishlist: 0, backlog: 0 })).toBeNull();
  });
});
