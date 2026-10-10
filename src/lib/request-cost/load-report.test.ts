import { describe, expect, it } from "vitest";
import {
  formatLoadReport,
  loadStepFamily,
  partitionLoadSamples,
  percentile,
  readLoadCostHeaders,
} from "./load-report";

describe("readLoadCostHeaders", () => {
  it("parses staging meter headers", () => {
    const headers = new Headers({
      "x-cost-wall-ms": "120",
      "x-cost-db-ms": "80",
      "x-cost-db-span-ms": "40",
      "x-cost-db-trips": "4",
      "x-cost-db-trip-detail": JSON.stringify([
        { ms: 40, sql: "select 1 from games" },
      ]),
    });
    expect(readLoadCostHeaders(headers)).toEqual({
      wallMs: 120,
      dbMs: 80,
      dbSpanMs: 40,
      dbTrips: 4,
      trips: [{ ms: 40, sql: "select 1 from games" }],
    });
  });

  it("omits missing or invalid values", () => {
    expect(readLoadCostHeaders(new Headers())).toEqual({});
    expect(
      readLoadCostHeaders(new Headers({ "x-cost-wall-ms": "nope" })),
    ).toEqual({});
  });
});

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
        {
          group: "general",
          step: "/rankings",
          status: 200,
          ms: 80,
          ok: true,
          wallMs: 40,
          dbMs: 90,
          dbSpanMs: 45,
          trips: [{ ms: 45, sql: "select count(*) from games" }],
        },
        { group: "write", step: "list", status: 401, ms: 20, ok: false },
      ],
    });
    expect(md).toContain("Started (UTC): 2026-10-09T17:00:00.000Z");
    expect(md).toContain("Writers: 10");
    expect(md).toContain("- general: 1 · p50 80 ms · p90 80 ms · p95 80 ms · p99 80 ms");
    expect(md).toContain("- /rankings: 1 · p50 80 ms");
    expect(md).toContain("- Errors: 1");
    expect(md).toContain("Worker wall p50 40 ms · p90 40 ms · p95 40 ms · p99 40 ms");
    expect(md).toContain("Neon db clock p50 45 ms · p90 45 ms · p95 45 ms · p99 45 ms");
    expect(md).toContain("Neon db sum p50 90 ms · p90 90 ms · p95 90 ms · p99 90 ms");
    expect(md).toContain("select count(*) from games");
  });

  it("rolls game detail paths into one family", () => {
    const md = formatLoadReport({
      scenario: "general",
      durationMs: 1000,
      vusRead: 1,
      writers: 0,
      startedAt: "2026-10-09T17:00:00.000Z",
      endedAt: "2026-10-09T17:00:01.000Z",
      samples: [
        { group: "general", step: "/games/a", status: 200, ms: 10, ok: true },
        { group: "general", step: "/games/b", status: 200, ms: 20, ok: true },
      ],
    });
    expect(md).toContain("- /games/:slug: 2");
  });
});

describe("loadStepFamily", () => {
  it("groups game detail paths", () => {
    expect(loadStepFamily("/games/portal-2")).toBe("/games/:slug");
    expect(loadStepFamily("/games")).toBe("/games");
    expect(loadStepFamily("list-create")).toBe("list-create");
    expect(loadStepFamily("list-edit")).toBe("list-edit");
    expect(loadStepFamily("list-reorder")).toBe("list-reorder");
    expect(loadStepFamily("list-delete")).toBe("list-delete");
  });

  it("groups site GOTY category boards", () => {
    expect(
      loadStepFamily(
        "/game-of-the-year/2025/categories?category=best-gameplay",
      ),
    ).toBe("/game-of-the-year/:year/categories?category=:id");
    expect(loadStepFamily("/game-of-the-year/2025/categories")).toBe(
      "/game-of-the-year/2025/categories",
    );
    expect(loadStepFamily("/game-of-the-year/2025")).toBe(
      "/game-of-the-year/2025",
    );
  });
});

describe("partitionLoadSamples", () => {
  it("splits p95 by path", () => {
    const rows = partitionLoadSamples(
      [
        { group: "general", step: "/", status: 200, ms: 10, ok: true },
        { group: "general", step: "/", status: 200, ms: 20, ok: true },
        { group: "general", step: "/games", status: 200, ms: 500, ok: true },
      ],
      "step",
    );
    expect(rows).toEqual([
      expect.objectContaining({ label: "/", n: 2, p95: 20 }),
      expect.objectContaining({ label: "/games", n: 1, p95: 500 }),
    ]);
  });
});
