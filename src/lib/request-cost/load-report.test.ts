import { describe, expect, it } from "vitest";
import { formatLoadReport, percentile } from "./load-report";

describe("percentile", () => {
  it("reads from a sorted series", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([10], 95)).toBe(10);
    expect(percentile([], 50)).toBe(0);
  });
});

describe("formatLoadReport", () => {
  it("includes the UTC window and group counts", () => {
    const md = formatLoadReport({
      scenario: "general",
      durationMs: 60_000,
      vusRead: 20,
      writers: 10,
      startedAt: "2026-10-09T17:00:00.000Z",
      endedAt: "2026-10-09T17:01:00.000Z",
      samples: [
        { group: "general", status: 200, ms: 80, ok: true },
        { group: "write", status: 401, ms: 20, ok: false },
      ],
    });
    expect(md).toContain("Started (UTC): 2026-10-09T17:00:00.000Z");
    expect(md).toContain("Writers: 10");
    expect(md).toContain("- general: 1");
    expect(md).toContain("- Errors: 1");
  });
});
