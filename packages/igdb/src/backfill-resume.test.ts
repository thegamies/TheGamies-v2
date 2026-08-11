import { describe, expect, it } from "vitest";
import { evaluateBackfillResume } from "./backfill-resume";

describe("evaluateBackfillResume", () => {
  it("does not continue without a last id", () => {
    expect(evaluateBackfillResume(null, { year: 2026 })).toEqual({
      afterId: 0,
      canContinue: false,
      year: 2026,
    });
  });

  it("continues after error, running, or page-cap hits", () => {
    expect(
      evaluateBackfillResume(
        {
          status: "error",
          pages: 3,
          lastIgdbId: 500,
          scope: { maxPages: 20 },
        },
        { year: 2026 },
      ),
    ).toEqual({ afterId: 500, canContinue: true, year: 2026 });

    expect(
      evaluateBackfillResume({
        status: "running",
        pages: 1,
        lastIgdbId: 10,
        scope: null,
      }),
    ).toMatchObject({ canContinue: true, afterId: 10 });

    expect(
      evaluateBackfillResume({
        status: "success",
        pages: 20,
        lastIgdbId: 999,
        scope: { maxPages: 20 },
      }),
    ).toMatchObject({ canContinue: true, afterId: 999 });

    expect(
      evaluateBackfillResume({
        status: "success",
        pages: 5,
        lastIgdbId: 999,
        scope: { maxPages: 20, truncated: true },
      }),
    ).toMatchObject({ canContinue: true });
  });

  it("does not continue a finished success under the page cap", () => {
    expect(
      evaluateBackfillResume(
        {
          status: "success",
          pages: 5,
          lastIgdbId: 100,
          scope: { maxPages: 20, truncated: false },
        },
        { year: 2026 },
      ),
    ).toEqual({ afterId: 0, canContinue: false, year: 2026 });
  });
});
