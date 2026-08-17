import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  computeEditionStatus,
  EDITION_PUBLIC_LABEL,
  editionBallotCountCopy,
  editionDeckCopy,
  editionDeleteConfirmMatches,
  editionOverviewLinkLabel,
  editionOverviewStatusLabel,
  editionOverviewTitle,
  editionScheduleDateBounds,
  editionScheduleSaveWarning,
  editionStatusLabel,
  formatEditionDateInput,
  formatEditionDateTimeInput,
  formatEditionScheduleTime,
  parseEditionDateInput,
  parseEditionDateTimeInput,
  parseEditionScheduleInput,
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
  it("shows the Events tab for any non-draft status", () => {
    expect(showEditionNav("draft")).toBe(false);
    expect(showEditionNav("scheduled")).toBe(true);
    expect(showEditionNav("open")).toBe(true);
    expect(showEditionNav("closed")).toBe(true);
    expect(showEditionNav("published")).toBe(true);
  });
});

describe("edition public copy", () => {
  it("uses product titles and decks without status jargon lines", () => {
    expect(EDITION_PUBLIC_LABEL).toBe("Events");
    expect(editionOverviewTitle(2026)).toBe("2026 Video Game Awards");
    expect(editionDeckCopy("published")).toBeNull();
    expect(editionDeckCopy("closed")).not.toMatch(/pending|published/i);
    expect(editionDeckCopy("scheduled")).toMatch(/hasn’t opened/i);
    expect(
      editionDeckCopy("scheduled", {
        opensAt: new Date("2026-11-01T18:00:00.000Z"),
      }),
    ).toMatch(/^Voting opens /);
    expect(editionDeckCopy("open")).toMatch(/Game of the Year/i);
    expect(
      editionDeckCopy("open", {
        closesAt: new Date("2026-12-15T18:00:00.000Z"),
      }),
    ).toMatch(/^Voting closes /);
    expect(
      editionDeckCopy("closed", {
        publishesAt: new Date("2026-12-20T18:00:00.000Z"),
      }),
    ).toMatch(/^Results reveal /);
    expect(editionOverviewLinkLabel(2026, "published")).toBe("2026 results");
    expect(editionOverviewLinkLabel(2026, "open")).toBe("2026 · Voting open");
    expect(editionStatusLabel("published")).toBe("Results");
    expect(editionStatusLabel("closed")).toBe("Voting closed");
  });

  it("uses an awards title and Community vote kicker on overview", () => {
    expect(editionOverviewTitle(2026)).toBe("2026 Video Game Awards");
    expect(editionOverviewStatusLabel("published")).toBe("Results");
    expect(editionOverviewStatusLabel("open")).toBe("Voting Open");
    expect(editionOverviewStatusLabel("closed")).toBe("Voting Closed");
    expect(editionOverviewStatusLabel("scheduled")).toBe("Coming Soon");
    const stamp = new Date("2026-11-01T18:00:00.000Z");
    expect(
      editionOverviewStatusLabel("scheduled", { opensAt: stamp }),
    ).toMatch(/^Opens /);
    expect(
      editionOverviewStatusLabel("open", { closesAt: stamp }),
    ).toMatch(/^Closes /);
    expect(
      editionOverviewStatusLabel("closed", { publishesAt: stamp }),
    ).toMatch(/^Reveals /);
    expect(formatEditionScheduleTime(stamp, "UTC")).toBe(
      "Nov 1, 2026, 6:00 PM",
    );
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

describe("edition date inputs", () => {
  it("parses and formats local calendar dates", () => {
    const parsed = parseEditionDateInput("2026-11-01");
    expect("ok" in parsed).toBe(true);
    if ("ok" in parsed) {
      expect(formatEditionDateInput(parsed.date)).toBe("2026-11-01");
    }
    expect(parseEditionDateInput("2026-13-01")).toEqual({
      error: "Pick a valid date.",
    });
    expect(addCalendarDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addCalendarDays("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("accepts date, datetime-local, and ISO schedule values", () => {
    expect("ok" in parseEditionScheduleInput("2026-11-01")).toBe(true);
    expect("ok" in parseEditionScheduleInput("2026-11-01T18:30")).toBe(true);
    expect("ok" in parseEditionScheduleInput("2026-11-01T18:30:00.000Z")).toBe(
      true,
    );
    expect(parseEditionScheduleInput("nope")).toEqual({
      error: "Pick a valid date.",
    });
  });

  it("chains picker bounds so later instants cannot precede earlier ones", () => {
    expect(
      editionScheduleDateBounds({
        opens: "2026-11-01T18:00",
        closes: "2026-12-15T18:00",
        publishes: "2026-12-20T18:00",
      }),
    ).toEqual({
      opensMax: "2026-12-15T17:59",
      closesMin: "2026-11-01T18:01",
      closesMax: "2026-12-20T18:00",
      publishesMin: "2026-12-15T18:00",
    });
  });
});

describe("editionScheduleSaveWarning", () => {
  it("skips the normal first save to coming soon or already open", () => {
    expect(editionScheduleSaveWarning("draft", "scheduled")).toBeNull();
    expect(editionScheduleSaveWarning("draft", "open")).toBeNull();
    expect(editionScheduleSaveWarning("open", "open")).toBeNull();
  });

  it("warns before reverting or jumping the live status", () => {
    expect(editionScheduleSaveWarning("published", "closed")).toMatch(/hide results/i);
    expect(editionScheduleSaveWarning("closed", "open")).toMatch(/reopen voting/i);
    expect(editionScheduleSaveWarning("open", "closed")).toMatch(/close voting immediately/i);
    expect(editionScheduleSaveWarning("scheduled", "open")).toMatch(/open voting immediately/i);
    expect(editionScheduleSaveWarning("open", "published")).toMatch(/publish results immediately/i);
  });
});

describe("editionDeleteConfirmMatches", () => {
  it("requires the exact year", () => {
    expect(editionDeleteConfirmMatches(2026, "2026")).toBe(true);
    expect(editionDeleteConfirmMatches(2026, " 2026 ")).toBe(true);
    expect(editionDeleteConfirmMatches(2026, "2025")).toBe(false);
    expect(editionDeleteConfirmMatches(2026, "26")).toBe(false);
    expect(editionDeleteConfirmMatches(2026, "")).toBe(false);
  });
});

describe("editionBallotCountCopy", () => {
  it("pluralizes submitted ballots", () => {
    expect(editionBallotCountCopy(0)).toBe("0 ballots submitted");
    expect(editionBallotCountCopy(1)).toBe("1 ballot submitted");
    expect(editionBallotCountCopy(12)).toBe("12 ballots submitted");
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
      rankMode: "competition",
      freezeStatus: "idle",
      freezeStartedAt: null,
      freezeError: null,
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
