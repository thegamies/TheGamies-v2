/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveStandingsView } from "./LiveStandingsView";
import type { StandingsPage } from "@/lib/live-aggregate/service";

const unpublished: StandingsPage = {
  year: 2026,
  listCount: 2,
  detailedStatsRevealed: false,
  standingsVersion: 0,
  scoresFresh: true,
  page: 1,
  pageSize: 50,
  gotyTotal: 0,
  totalPages: 1,
  goty: [],
  categories: [],
  categoryGroup: "all",
  view: "goty",
  categoryId: null,
  categoryGameTotal: 0,
  gotyPublic: false,
  categoriesPublic: false,
};

describe("LiveStandingsView", () => {
  it("uses editorial empty copy and hides list count below the publish floor", () => {
    render(<LiveStandingsView page={unpublished} yearOptions={[2026]} />);
    expect(
      screen.getByText("This year's board is still coming together."),
    ).toBeTruthy();
    expect(screen.queryByText(/2 lists/)).toBeNull();
  });
});
