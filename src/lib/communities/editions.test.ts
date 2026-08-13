import { describe, expect, it } from "vitest";
import {
  computeEditionStatus,
  editionDeckCopy,
  editionOverviewLinkLabel,
  editionSectionTitle,
  editionStatusLabel,
  formatEditionDateTimeInput,
  parseEditionDateTimeInput,
  parseEditionYear,
  showEditionNav,
  validateEditionSchedule,
} from "./edition-status";
import { pickFeaturedEdition, type CommunityEditionPublic } from "./editions";

describe("computeEditionStatus", () => {
  const opensAt = new Date("2026-11-01T00:00:00.000Z");
  const closesAt = new Date("2026-12-15T00:00:00.000Z");
  const publishesAt = new Date("2026-12-20T00:00:00.000Z");

  it("is draft until all three times are set", () => {
    expect(
      computeEditionStatus({
        opensAt,
        closesAt,
        publishesAt: null,
      }),
    ).toBe("draft");
  });

  it("derives scheduled, open, closed, and published from now", () => {
    const schedule = { opensAt, closesAt, publishesAt };
    expect(
      computeEditionStatus(schedule, new Date("2026-10-01T00:00:00.000Z")),
    ).toBe("scheduled");
    expect(
      computeEditionStatus(schedule, new Date("2026-11-15T00:00:00.000Z")),
    ).toBe("open");
    expect(
      computeEditionStatus(schedule, new Date("2026-12-16T00:00:00.000Z")),
    ).toBe("closed");
    expect(
      computeEditionStatus(schedule, new Date("2026-12-21T00:00:00.000Z")),
    ).toBe("published");
  });
});

describe("validateEditionSchedule", () => {
  it("requires opens before closes and closes on or before publish", () => {
    const opens = new Date("2026-11-01T00:00:00.000Z");
    const closes = new Date("2026-12-01T00:00:00.000Z");
    const publishes = new Date("2026-12-01T00:00:00.000Z");
    expect(validateEditionSchedule(opens, closes, publishes)).toBeNull();
    expect(
      validateEditionSchedule(closes, opens, publishes),
    ).toMatch(/open before/i);
    expect(
      validateEditionSchedule(
        opens,
        new Date("2026-12-10T00:00:00.000Z"),
        closes,
      ),
    ).toMatch(/publish before/i);
  });
});

describe("edition nav gates", () => {
  it("shows the Edition tab for any non-draft status", () => {
    expect(showEditionNav("draft")).toBe(false);
    expect(showEditionNav("scheduled")).toBe(true);
    expect(showEditionNav("open")).toBe(true);
    expect(showEditionNav("closed")).toBe(true);
    expect(showEditionNav("published")).toBe(true);
  });
});

describe("edition public copy", () => {
  it("uses product titles and decks without status jargon lines", () => {
    expect(editionSectionTitle("published")).toBe("Results");
    expect(editionSectionTitle("open")).toBe("Game of the Year");
    expect(editionDeckCopy("published")).toBeNull();
    expect(editionDeckCopy("closed")).not.toMatch(/pending|published/i);
    expect(editionOverviewLinkLabel(2026, "published")).toBe("2026 results");
    expect(editionOverviewLinkLabel(2026, "open")).toBe("2026 · Voting open");
    expect(editionStatusLabel("published")).toBe("Results");
    expect(editionStatusLabel("closed")).toBe("Voting closed");
  });
});

describe("parseEditionYear / datetime", () => {
  it("accepts years and datetime-local strings", () => {
    expect(parseEditionYear("2026")).toEqual({ ok: true, year: 2026 });
    expect(parseEditionYear("nope")).toEqual({ error: "Pick a valid year." });
    const parsed = parseEditionDateTimeInput("2026-11-01T18:30");
    expect("ok" in parsed).toBe(true);
    expect(parseEditionDateTimeInput("bad")).toEqual({
      error: "Pick a valid date and time.",
    });
    const roundTrip = formatEditionDateTimeInput(
      new Date(2026, 10, 1, 18, 30),
    );
    expect(roundTrip).toBe("2026-11-01T18:30");
  });
});

describe("pickFeaturedEdition", () => {
  function edition(
    partial: Partial<CommunityEditionPublic> & {
      year: number;
      status: CommunityEditionPublic["status"];
    },
  ): CommunityEditionPublic {
    return {
      id: "e",
      communityId: "c",
      opensAt: null,
      closesAt: null,
      publishesAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    };
  }

  it("prefers current-year non-draft, then open, then latest", () => {
    const editions = [
      edition({ year: 2025, status: "published" }),
      edition({ year: 2026, status: "open" }),
      edition({ year: 2024, status: "draft" }),
    ];
    expect(pickFeaturedEdition(editions, 2026)?.year).toBe(2026);
    expect(
      pickFeaturedEdition(
        [
          edition({ year: 2025, status: "published" }),
          edition({ year: 2024, status: "open" }),
        ],
        2026,
      )?.year,
    ).toBe(2024);
  });
});
