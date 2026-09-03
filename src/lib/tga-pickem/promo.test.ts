import { describe, expect, it } from "vitest";
import {
  communityTgaSettingsEmptyReason,
  pickCommunityTgaPromoYear,
  pickCommunityTgaSettingsYear,
  tgaPromoCopy,
  tgaPromoTitle,
} from "./promo";

const schedule = {
  enabled: true,
  opensAt: new Date("2026-12-01T18:00:00.000Z"),
  showStartsAt: new Date("2026-12-11T01:00:00.000Z"),
};

describe("tgaPromoCopy", () => {
  it("uses coming-soon copy before picks open", () => {
    const copy = tgaPromoCopy(schedule, new Date("2026-11-01T00:00:00.000Z"));
    expect(copy.accent).toBe("Picks soon.");
    expect(copy.status).toBe("Coming soon");
    expect(copy.live).toBe(false);
    expect(copy.rest).toMatch(/^The board opens /);
    expect(copy.cta).toBe("Open Pick’em");
  });

  it("uses open-picks copy while the board is live", () => {
    const copy = tgaPromoCopy(schedule, new Date("2026-12-05T00:00:00.000Z"));
    expect(copy.accent).toBe("Picks are open.");
    expect(copy.status).toBe("Picks open");
    expect(copy.live).toBe(true);
    expect(copy.cta).toBe("Make your picks");
    expect(copy.rest).toMatch(/show starts/);
  });

  it("uses live-results copy after the show starts", () => {
    const copy = tgaPromoCopy(schedule, new Date("2026-12-11T01:00:00.000Z"));
    expect(copy.accent).toBe("Live results.");
    expect(copy.rest).toBe("See how your picks stack up.");
    expect(copy.status).toBe("Live");
    expect(copy.live).toBe(true);
    expect(copy.cta).toBe("Open Pick’em");
  });

  it("puts the year in the title and keeps Pick’em with Awards", () => {
    expect(tgaPromoTitle(2025)).toBe("2025 Video Game Awards\u00A0Pick’em");
  });

  it("prefers a promoted community year over a newer one", () => {
    expect(
      pickCommunityTgaPromoYear([
        { year: 2026, promoted: false },
        { year: 2025, promoted: true },
      ])?.year,
    ).toBe(2025);
    expect(
      pickCommunityTgaPromoYear([
        { year: 2024, promoted: false },
        { year: 2026, promoted: false },
      ])?.year,
    ).toBe(2026);
    expect(pickCommunityTgaPromoYear([])).toBeNull();
  });

  it("does not offer a locked year in community settings", () => {
    expect(
      pickCommunityTgaSettingsYear([
        {
          year: 2026,
          promoted: true,
          enabled: true,
          status: "locked" as const,
        },
        {
          year: 2027,
          promoted: false,
          enabled: true,
          status: "scheduled" as const,
        },
      ])?.year,
    ).toBe(2027);
    expect(
      pickCommunityTgaSettingsYear(
        [
          {
            year: 2027,
            promoted: false,
            enabled: true,
            status: "scheduled" as const,
          },
        ],
        [2027],
      ),
    ).toBeNull();
    expect(
      communityTgaSettingsEmptyReason([
        { enabled: true, status: "locked" },
      ]),
    ).toBe("locked");
    expect(
      communityTgaSettingsEmptyReason([{ enabled: false, status: "off" }]),
    ).toBe("none");
  });

  it("falls back when the year is off", () => {
    const copy = tgaPromoCopy(
      { enabled: false, opensAt: schedule.opensAt, showStartsAt: schedule.showStartsAt },
      new Date("2026-12-05T00:00:00.000Z"),
    );
    expect(copy.accent).toBe("Coming soon.");
    expect(copy.live).toBe(false);
  });
});
