import { describe, expect, it } from "vitest";
import {
  legacyGameIndexHref,
  legacyGameSlugHref,
} from "./legacy-game-redirect";

describe("legacyGameIndexHref", () => {
  it("redirects the catalog index", () => {
    expect(legacyGameIndexHref()).toBe("/games");
  });

  it("keeps browse query params", () => {
    expect(legacyGameIndexHref({ q: "clair", year: "2026" })).toBe(
      "/games?q=clair&year=2026",
    );
  });
});

describe("legacyGameSlugHref", () => {
  it("redirects a game detail slug", () => {
    expect(legacyGameSlugHref("clair-obscur-expedition-33")).toBe(
      "/games/clair-obscur-expedition-33",
    );
  });

  it("keeps query params on detail redirects", () => {
    expect(legacyGameSlugHref("hades-ii", { view: "ranks" })).toBe(
      "/games/hades-ii?view=ranks",
    );
  });
});
