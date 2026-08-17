import { describe, expect, it } from "vitest";
import { paginateCommunityMembers } from "./members-page";

describe("paginateCommunityMembers", () => {
  it("clamps page within range", () => {
    expect(paginateCommunityMembers(0, 120)).toEqual({
      page: 1,
      offset: 0,
      totalPages: 3,
    });
    expect(paginateCommunityMembers(99, 120)).toEqual({
      page: 3,
      offset: 100,
      totalPages: 3,
    });
  });
});
