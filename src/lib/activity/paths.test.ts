import { describe, expect, it } from "vitest";
import {
  followingHref,
  gamesBrowseHref,
  parseFollowingView,
  peopleHref,
  trendingHref,
} from "./paths";

describe("trendingHref", () => {
  it("puts site trending on Games as a sort filter", () => {
    expect(trendingHref()).toBe("/games?sort=trending");
    expect(trendingHref({ hours: 24 })).toBe("/games?sort=trending&hours=24");
    expect(trendingHref({ scope: "following" })).toBe(
      "/games?sort=trending&scope=following",
    );
    expect(trendingHref({ page: 2 })).toBe("/games?sort=trending&page=2");
  });

  it("keeps community trending on the community tab", () => {
    expect(trendingHref({ communitySlug: "eric" })).toBe(
      "/communities/eric/trending",
    );
    expect(trendingHref({ communitySlug: "eric", hours: 24 })).toBe(
      "/communities/eric/trending?hours=24",
    );
  });
});

describe("parseFollowingView", () => {
  it("defaults to the activity feed", () => {
    expect(parseFollowingView(undefined)).toBe("activity");
    expect(parseFollowingView("feed")).toBe("activity");
    expect(parseFollowingView("activity")).toBe("activity");
    expect(parseFollowingView("followers")).toBe("followers");
    expect(parseFollowingView("discover")).toBe("discover");
    expect(parseFollowingView("following")).toBe("following");
    expect(parseFollowingView("trending")).toBe("trending");
  });
});

describe("followingHref", () => {
  it("omits the default activity view from the query", () => {
    expect(followingHref()).toBe("/following");
    expect(followingHref({ view: "activity" })).toBe("/following");
    expect(followingHref({ view: "following" })).toBe(
      "/following?view=following",
    );
    expect(followingHref({ view: "trending" })).toBe(
      "/following?view=trending",
    );
    expect(followingHref({ view: "trending", hours: 24 })).toBe(
      "/following?view=trending&hours=24",
    );
    expect(followingHref({ view: "discover", q: "ada" })).toBe(
      "/following?view=discover&q=ada",
    );
  });
});

describe("peopleHref", () => {
  it("keeps a blank search off the query string", () => {
    expect(peopleHref()).toBe("/people");
    expect(peopleHref({ q: "  " })).toBe("/people");
    expect(peopleHref({ q: "ada" })).toBe("/people?q=ada");
  });
});

describe("gamesBrowseHref", () => {
  it("omits default catalog filters and page 1", () => {
    expect(gamesBrowseHref()).toBe("/games");
    expect(gamesBrowseHref({ page: 1 })).toBe("/games");
    expect(gamesBrowseHref({ q: "forza", page: 2 })).toBe(
      "/games?q=forza&page=2",
    );
  });

  it("keeps trending hours and following scope", () => {
    expect(gamesBrowseHref({ sort: "trending", page: 3 })).toBe(
      "/games?sort=trending&page=3",
    );
    expect(
      gamesBrowseHref({
        sort: "trending",
        hours: 24,
        scope: "following",
        page: 2,
      }),
    ).toBe("/games?sort=trending&hours=24&scope=following&page=2");
  });
});
