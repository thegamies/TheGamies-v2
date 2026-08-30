import { describe, expect, it } from "vitest";
import {
  clientDraftGotyYear,
  createGotyEntryMode,
  shouldDiscardLocalGotyDraft,
} from "./create-goty-entry";

describe("shouldDiscardLocalGotyDraft", () => {
  const owned = {
    signedIn: true,
    draftIsGoty: true,
    draftYear: 2026,
    accountHasGotyForYear: true,
  };

  it("discards when signed in and that GOTY year is already owned", () => {
    expect(shouldDiscardLocalGotyDraft(owned)).toBe(true);
  });

  it("keeps the draft when signed out", () => {
    expect(shouldDiscardLocalGotyDraft({ ...owned, signedIn: false })).toBe(
      false,
    );
  });

  it("keeps custom-list drafts", () => {
    expect(shouldDiscardLocalGotyDraft({ ...owned, draftIsGoty: false })).toBe(
      false,
    );
  });

  it("keeps a GOTY draft when the account has no list for that year", () => {
    expect(
      shouldDiscardLocalGotyDraft({ ...owned, accountHasGotyForYear: false }),
    ).toBe(false);
  });

  it("does not discard without a draft year", () => {
    expect(shouldDiscardLocalGotyDraft({ ...owned, draftYear: null })).toBe(
      false,
    );
  });
});

describe("clientDraftGotyYear", () => {
  it("reads a finite GOTY year", () => {
    expect(clientDraftGotyYear({ listType: "goty", year: 2026.8 })).toBe(2026);
  });

  it("ignores custom drafts and invalid years", () => {
    expect(clientDraftGotyYear({ listType: "custom", year: 2026 })).toBe(null);
    expect(clientDraftGotyYear({ listType: "goty", year: "2026" })).toBe(null);
  });
});

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

  it("skips auth-intent when the local GOTY draft should be discarded", () => {
    expect(
      createGotyEntryMode({
        signedIn: true,
        resume: false,
        authIntent: true,
        yearParam: "2026",
        discardLocalGotyDraft: true,
      }),
    ).toBe("signed-in-year");
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
