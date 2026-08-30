import { describe, expect, it } from "vitest";
import {
  EDITION_PROMO_KICKER,
  editionPromoCopy,
  editionPromoTitle,
} from "./edition-promo";

const stamp = new Date("2026-11-01T18:00:00.000Z");

describe("editionPromoCopy", () => {
  it("puts the year in the title and keeps Awards with Game", () => {
    expect(editionPromoTitle(2026)).toBe("2026 Video Game\u00A0Awards");
  });

  it("uses scheduled copy with an open time", () => {
    const copy = editionPromoCopy("scheduled", { opensAt: stamp });
    expect(copy.kicker).toBe(EDITION_PROMO_KICKER);
    expect(copy.accent).toBe("Coming soon.");
    expect(copy.rest).toMatch(/^Voting opens /);
    expect(copy.live).toBe(false);
    expect(copy.cta).toBe("View event");
  });

  it("treats open voting as live", () => {
    const copy = editionPromoCopy("open", { closesAt: stamp });
    expect(copy.kicker).toBe(EDITION_PROMO_KICKER);
    expect(copy.accent).toBe("Voting is open.");
    expect(copy.status).toBe("Voting open");
    expect(copy.live).toBe(true);
    expect(copy.cta).toBe("Cast your ballot");
    expect(copy.rest).toMatch(/^Lock your ballot/);
  });

  it("uses locked-ballot copy while waiting on results", () => {
    const copy = editionPromoCopy("closed", { publishesAt: stamp });
    expect(copy.kicker).toBe(EDITION_PROMO_KICKER);
    expect(copy.accent).toBe("Ballots are locked.");
    expect(copy.rest).toMatch(/^Results reveal /);
    expect(copy.live).toBe(false);
    expect(copy.cta).toBe("View event");
  });

  it("points published events at the boards", () => {
    const copy = editionPromoCopy("published");
    expect(copy.kicker).toBe(EDITION_PROMO_KICKER);
    expect(copy.accent).toBe("Results are in.");
    expect(copy.rest).toBe("See Combined, Community, and Hosts.");
    expect(copy.status).toBe("Results");
    expect(copy.cta).toBe("See results");
  });
});
