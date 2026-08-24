import { describe, expect, it } from "vitest";
import {
  parseTgaBoardMode,
  parseTgaSheetUsername,
  parseTgaYearView,
  tgaYearHref,
} from "./year-href";

describe("tgaYearHref", () => {
  it("defaults to the ballot with a clean URL", () => {
    expect(parseTgaYearView(undefined)).toBe("ballot");
    expect(tgaYearHref("/the-game-awards/2025")).toBe("/the-game-awards/2025");
    expect(tgaYearHref("/the-game-awards/2025", { view: "ballot" })).toBe(
      "/the-game-awards/2025",
    );
  });

  it("pages only on standings", () => {
    expect(tgaYearHref("/the-game-awards/2025", { view: "standings" })).toBe(
      "/the-game-awards/2025?view=standings",
    );
    expect(
      tgaYearHref("/the-game-awards/2025", { view: "standings", page: 2 }),
    ).toBe("/the-game-awards/2025?view=standings&page=2");
    expect(tgaYearHref("/the-game-awards/2025", { view: "ballot", page: 2 })).toBe(
      "/the-game-awards/2025",
    );
  });

  it("opens a locked sheet from standings", () => {
    expect(
      tgaYearHref("/the-game-awards/2025", {
        view: "sheet",
        username: "ada",
      }),
    ).toBe("/the-game-awards/2025?view=sheet&u=ada");
    expect(parseTgaYearView("sheet")).toBe("sheet");
    expect(parseTgaSheetUsername("Ada")).toBe("ada");
    expect(parseTgaSheetUsername("x")).toBeNull();
  });

  it("keeps Hosts board and Settings on the year URL", () => {
    expect(parseTgaYearView("settings")).toBe("settings");
    expect(parseTgaBoardMode("voices")).toBe("voices");
    expect(parseTgaBoardMode(undefined)).toBe("community");
    expect(
      tgaYearHref("/communities/eric/the-game-awards/2025", {
        view: "standings",
        mode: "voices",
        page: 2,
      }),
    ).toBe(
      "/communities/eric/the-game-awards/2025?view=standings&mode=voices&page=2",
    );
    expect(
      tgaYearHref("/communities/eric/the-game-awards/2025", {
        view: "settings",
      }),
    ).toBe("/communities/eric/the-game-awards/2025?view=settings");
  });
});
