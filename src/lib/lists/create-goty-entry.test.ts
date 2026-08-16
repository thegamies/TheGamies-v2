import { describe, expect, it } from "vitest";
import { createGotyEntryMode } from "./create-goty-entry";

describe("createGotyEntryMode", () => {
  it("prefers auth-intent over signed-in year picker", () => {
    expect(
      createGotyEntryMode({
        signedIn: true,
        resume: false,
        authIntent: true,
        yearParam: "2026",
      }),
    ).toBe("auth-intent");
  });

  it("uses year picker when signed in without intent", () => {
    expect(
      createGotyEntryMode({
        signedIn: true,
        resume: false,
        authIntent: false,
        yearParam: "2026",
      }),
    ).toBe("signed-in-year");
  });

  it("opens anon editor for year when signed out", () => {
    expect(
      createGotyEntryMode({
        signedIn: false,
        resume: false,
        authIntent: false,
        yearParam: "2026",
      }),
    ).toBe("anon-year");
  });
});
