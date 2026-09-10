import { describe, expect, it } from "vitest";
import {
  customResultDisplayTitle,
  customResultTallyKind,
} from "./custom-category-types";

describe("customResultDisplayTitle", () => {
  it("returns the title when there is no subtitle", () => {
    expect(customResultDisplayTitle("Test")).toBe("Test");
    expect(customResultDisplayTitle("Test", null)).toBe("Test");
    expect(customResultDisplayTitle("Test", "")).toBe("Test");
  });

  it("joins entry title and associated game", () => {
    expect(customResultDisplayTitle("Test", "Onimusha: Way of the Sword")).toBe(
      "Test — Onimusha: Way of the Sword",
    );
  });
});

describe("customResultTallyKind", () => {
  it("counts entries for text awards", () => {
    expect(customResultTallyKind("text_only")).toBe("entry");
    expect(customResultTallyKind("text_game")).toBe("entry");
  });

  it("counts games for game awards", () => {
    expect(customResultTallyKind("any_game")).toBe("game");
    expect(customResultTallyKind("selected_games")).toBe("game");
    expect(customResultTallyKind(null)).toBe("game");
  });
});
