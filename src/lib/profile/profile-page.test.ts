import { describe, expect, it } from "vitest";
import {
  PROFILE_COMMUNITIES_PAGE_SIZE,
  PROFILE_LIST_PREVIEW_ITEM_LIMIT,
  PROFILE_LISTS_PAGE_SIZE,
  paginateProfileItems,
  parseProfilePage,
  parseProfileTab,
  profileHref,
} from "./profile-page";

describe("parseProfileTab", () => {
  it("defaults to lists", () => {
    expect(parseProfileTab(undefined)).toBe("lists");
    expect(parseProfileTab("lists")).toBe("lists");
    expect(parseProfileTab("nope")).toBe("lists");
    expect(parseProfileTab("communities")).toBe("communities");
  });
});

describe("parseProfilePage", () => {
  it("clamps invalid values to 1", () => {
    expect(parseProfilePage(undefined)).toBe(1);
    expect(parseProfilePage("0")).toBe(1);
    expect(parseProfilePage("-2")).toBe(1);
    expect(parseProfilePage("3")).toBe(3);
    expect(parseProfilePage(["2"])).toBe(2);
  });
});

describe("profileHref", () => {
  it("omits the default lists tab and page 1", () => {
    expect(profileHref("alex")).toBe("/u/alex");
    expect(profileHref("alex", { tab: "lists" })).toBe("/u/alex");
    expect(profileHref("alex", { tab: "lists", page: 1 })).toBe("/u/alex");
  });

  it("sets communities and later pages", () => {
    expect(profileHref("alex", { tab: "communities" })).toBe(
      "/u/alex?tab=communities",
    );
    expect(profileHref("alex", { tab: "lists", page: 2 })).toBe(
      "/u/alex?page=2",
    );
    expect(profileHref("alex", { tab: "communities", page: 3 })).toBe(
      "/u/alex?tab=communities&page=3",
    );
  });

  it("encodes the username", () => {
    expect(profileHref("a b")).toBe("/u/a%20b");
  });
});

describe("paginateProfileItems", () => {
  it("caps lists at 12 and communities at 24", () => {
    expect(PROFILE_LISTS_PAGE_SIZE).toBe(12);
    expect(PROFILE_COMMUNITIES_PAGE_SIZE).toBe(24);
    expect(PROFILE_LIST_PREVIEW_ITEM_LIMIT).toBe(5);
  });

  it("clamps the page and computes offset", () => {
    expect(paginateProfileItems(1, 25, 12)).toEqual({
      page: 1,
      offset: 0,
      totalPages: 3,
    });
    expect(paginateProfileItems(99, 25, 12)).toEqual({
      page: 3,
      offset: 24,
      totalPages: 3,
    });
    expect(paginateProfileItems(0, 0, 12)).toEqual({
      page: 1,
      offset: 0,
      totalPages: 1,
    });
  });
});
