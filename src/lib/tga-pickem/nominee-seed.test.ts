import { describe, expect, it } from "vitest";
import { normalizeNomineeTitle } from "./nominee-seed";

describe("normalizeNomineeTitle", () => {
  it("treats punctuation variants as the same title", () => {
    expect(normalizeNomineeTitle("Clair Obscur: Expedition 33")).toBe(
      normalizeNomineeTitle("Clair Obscur Expedition 33"),
    );
    expect(normalizeNomineeTitle("Baldur's Gate 3")).toBe(
      normalizeNomineeTitle("Baldurs Gate 3"),
    );
  });
});
