import { describe, expect, it, vi } from "vitest";

vi.mock("@thegamies/db", () => ({
  createDb: vi.fn(),
  profiles: {},
}));

import { PEOPLE_SEARCH_LIMIT, peopleSearchTerm, searchPeople } from "./search";

describe("peopleSearchTerm", () => {
  it("rejects blank queries so search never dumps the roster", () => {
    expect(peopleSearchTerm("")).toBeNull();
    expect(peopleSearchTerm("   ")).toBeNull();
    expect(peopleSearchTerm("ada")).toBe("ada");
  });
});

describe("searchPeople", () => {
  it("returns no hits for a blank query without querying profiles", async () => {
    await expect(searchPeople("   ")).resolves.toEqual([]);
    await expect(searchPeople("")).resolves.toEqual([]);
  });

  it("caps hits", () => {
    expect(PEOPLE_SEARCH_LIMIT).toBe(24);
  });
});
