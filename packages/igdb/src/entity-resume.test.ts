import { describe, expect, it } from "vitest";
import {
  evaluateEntityResume,
  walkTruncated,
} from "./entity-resume";
import { evaluateBackfillResume } from "./backfill-resume";

describe("evaluateEntityResume", () => {
  it("does not continue without a last id", () => {
    expect(evaluateEntityResume(null)).toEqual({
      afterId: 0,
      canContinue: false,
      sinceUnix: null,
    });
  });

  it("continues after error, running, or truncated", () => {
    expect(
      evaluateEntityResume({
        status: "error",
        pages: 3,
        lastIgdbId: 500,
        scope: { maxPages: 20 },
      }),
    ).toMatchObject({ afterId: 500, canContinue: true });

    expect(
      evaluateEntityResume({
        status: "running",
        pages: 1,
        lastIgdbId: 10,
        scope: null,
      }),
    ).toMatchObject({ canContinue: true, afterId: 10 });

    expect(
      evaluateEntityResume({
        status: "success",
        pages: 1,
        lastIgdbId: 999,
        scope: { maxPages: 1, truncated: true },
      }),
    ).toMatchObject({ canContinue: true, afterId: 999 });
  });

  it("does not treat a large unlimited walk as truncated", () => {
    expect(
      evaluateEntityResume({
        status: "success",
        pages: 200,
        lastIgdbId: 100_000,
        scope: { maxPages: null, truncated: false, sinceUnix: 1_700_000_000 },
      }),
    ).toEqual({
      afterId: 0,
      canContinue: false,
      sinceUnix: 1_700_000_000,
    });
  });

  it("keeps sinceUnix when resuming a truncated updated window", () => {
    expect(
      evaluateEntityResume({
        status: "success",
        pages: 1,
        lastIgdbId: 40,
        scope: { maxPages: 1, truncated: true, sinceUnix: 1_700_000_100 },
      }),
    ).toEqual({
      afterId: 40,
      canContinue: true,
      sinceUnix: 1_700_000_100,
    });
  });
});

describe("walkTruncated", () => {
  it("is false without a page cap", () => {
    expect(walkTruncated(50, undefined, true)).toBe(false);
  });

  it("requires a full last page at the cap", () => {
    expect(walkTruncated(1, 1, true)).toBe(true);
    expect(walkTruncated(1, 1, false)).toBe(false);
  });
});

describe("evaluateBackfillResume", () => {
  it("still continues a finished success that hit the year page cap", () => {
    expect(
      evaluateBackfillResume({
        status: "success",
        pages: 20,
        lastIgdbId: 999,
        scope: { maxPages: 20 },
      }),
    ).toMatchObject({ canContinue: true, afterId: 999 });
  });
});
