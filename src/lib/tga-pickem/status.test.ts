import { describe, expect, it } from "vitest";
import {
  chromePromoted,
  computeTgaStatus,
  picksAreOpen,
  revealTgaWinners,
  slateCompleteReason,
  validateTgaSchedule,
} from "./status";

describe("computeTgaStatus", () => {
  const opensAt = new Date("2026-12-01T18:00:00.000Z");
  const showStartsAt = new Date("2026-12-11T01:00:00.000Z");

  it("is off when disabled", () => {
    expect(
      computeTgaStatus(
        { enabled: false, opensAt, showStartsAt },
        new Date("2026-12-05T00:00:00.000Z"),
      ),
    ).toBe("off");
  });

  it("is draft without a full schedule", () => {
    expect(computeTgaStatus({ enabled: true, opensAt: null, showStartsAt })).toBe(
      "draft",
    );
  });

  it("walks scheduled → open → locked", () => {
    const year = { enabled: true, opensAt, showStartsAt };
    expect(computeTgaStatus(year, new Date("2026-11-01T00:00:00.000Z"))).toBe(
      "scheduled",
    );
    expect(computeTgaStatus(year, new Date("2026-12-05T00:00:00.000Z"))).toBe(
      "open",
    );
    expect(computeTgaStatus(year, new Date("2026-12-11T01:00:00.000Z"))).toBe(
      "locked",
    );
  });
});

describe("validateTgaSchedule", () => {
  it("requires show start after open", () => {
    const a = new Date("2026-12-11T00:00:00.000Z");
    const b = new Date("2026-12-01T00:00:00.000Z");
    expect(validateTgaSchedule(a, b)).toMatch(/before the show/);
    expect(validateTgaSchedule(b, a)).toBeNull();
  });
});

describe("visibility helpers", () => {
  it("only promotes when on", () => {
    expect(chromePromoted({ enabled: false, promoted: true })).toBe(false);
    expect(chromePromoted({ enabled: true, promoted: true })).toBe(true);
  });

  it("opens picks only while status is open", () => {
    expect(
      picksAreOpen(
        {
          enabled: true,
          opensAt: new Date("2026-12-01T00:00:00.000Z"),
          showStartsAt: new Date("2026-12-11T00:00:00.000Z"),
        },
        new Date("2026-12-05T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("hides official winners while picks are open", () => {
    const year = {
      enabled: true,
      opensAt: new Date("2026-12-01T00:00:00.000Z"),
      showStartsAt: new Date("2026-12-11T00:00:00.000Z"),
    };
    expect(revealTgaWinners(year, new Date("2026-11-01T00:00:00.000Z"))).toBe(
      false,
    );
    expect(revealTgaWinners(year, new Date("2026-12-05T00:00:00.000Z"))).toBe(
      false,
    );
    expect(revealTgaWinners(year, new Date("2026-12-11T01:00:00.000Z"))).toBe(
      true,
    );
  });
});

describe("slateCompleteReason", () => {
  const schedule = {
    opensAt: new Date("2026-12-01T00:00:00.000Z"),
    showStartsAt: new Date("2026-12-11T00:00:00.000Z"),
  };

  it("requires schedule, categories, and valid nominees", () => {
    expect(slateCompleteReason([], {})).toMatch(/open/);
    expect(slateCompleteReason([], schedule)).toMatch(/category/);
    expect(
      slateCompleteReason(
        [
          {
            kind: "game",
            nomineeCount: 0,
            gameNomineesMissingGame: 0,
            otherNomineesMissingArt: 0,
          },
        ],
        schedule,
      ),
    ).toMatch(/nominee/);
    expect(
      slateCompleteReason(
        [
          {
            kind: "game",
            nomineeCount: 2,
            gameNomineesMissingGame: 0,
            otherNomineesMissingArt: 0,
          },
        ],
        schedule,
      ),
    ).toBeNull();
  });

  it("does not require artwork to turn on", () => {
    expect(
      slateCompleteReason(
        [
          {
            kind: "other",
            nomineeCount: 3,
            gameNomineesMissingGame: 0,
            otherNomineesMissingArt: 3,
          },
        ],
        schedule,
      ),
    ).toBeNull();
  });
});
