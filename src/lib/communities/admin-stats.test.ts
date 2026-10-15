import { describe, expect, it } from "vitest";
import {
  ADMIN_COMMUNITY_STATS_PAGE_SIZE,
  ADMIN_COMMUNITY_STATS_SEARCH_LIMIT,
  parseAdminCommunityStatsQuery,
} from "./admin-stats";

describe("parseAdminCommunityStatsQuery", () => {
  it("pages the default roster without a search dump", () => {
    const parsed = parseAdminCommunityStatsQuery({});
    expect(parsed.q).toBe("");
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(ADMIN_COMMUNITY_STATS_PAGE_SIZE);
    expect(parsed.offset).toBe(0);
  });

  it("searches in SQL with a hit cap", () => {
    const parsed = parseAdminCommunityStatsQuery({ q: "  seed_pem_  ", page: 3 });
    expect(parsed.q).toBe("seed_pem_");
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(ADMIN_COMMUNITY_STATS_SEARCH_LIMIT);
    expect(parsed.offset).toBe(2 * ADMIN_COMMUNITY_STATS_SEARCH_LIMIT);
  });

  it("floors invalid pages to 1", () => {
    expect(parseAdminCommunityStatsQuery({ page: 0 }).page).toBe(1);
    expect(parseAdminCommunityStatsQuery({ page: -2 }).page).toBe(1);
  });
});
