import { describe, expect, it } from "vitest";
import { isUndeliverableEmailAddress } from "./send";

describe("isUndeliverableEmailAddress", () => {
  it("flags reserved example and test domains", () => {
    expect(isUndeliverableEmailAddress("qa@example.com")).toBe(true);
    expect(isUndeliverableEmailAddress("QA@Example.ORG")).toBe(true);
    expect(isUndeliverableEmailAddress("qa@mail.example")).toBe(true);
    expect(isUndeliverableEmailAddress("qa@thegamies.invalid")).toBe(true);
    expect(isUndeliverableEmailAddress("qa@box.test")).toBe(true);
  });

  it("leaves real domains alone", () => {
    expect(isUndeliverableEmailAddress("ada@gmail.com")).toBe(false);
    expect(isUndeliverableEmailAddress("ada@notexample.com")).toBe(false);
    expect(isUndeliverableEmailAddress("ada@testing.io")).toBe(false);
    expect(isUndeliverableEmailAddress(undefined)).toBe(false);
  });
});
