import { describe, expect, it } from "vitest";
import { formatLoadHtmlReport } from "./load-html-report";
import type { LoadRunStats } from "./load-report";

const stats: LoadRunStats = {
  scenario: "general",
  durationMs: 60_000,
  vusRead: 20,
  writers: 10,
  startedAt: "2026-10-09T17:00:00.000Z",
  endedAt: "2026-10-09T17:01:00.000Z",
  samples: [
    { group: "general", step: "/", status: 200, ms: 80, ok: true, wallMs: 40, dbMs: 90, dbSpanMs: 50, dbTrips: 4, trips: [{ ms: 50, sql: "select count(*) from games" }] },
    { group: "general", step: "/rankings", status: 200, ms: 400, ok: true },
    { group: "write", step: "list", status: 401, ms: 20, ok: false },
  ],
};

describe("formatLoadHtmlReport", () => {
  it("embeds samples and filter controls", () => {
    const html = formatLoadHtmlReport(stats);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('id="groups"');
    expect(html).toContain('id="steps"');
    expect(html).toContain('id="families"');
    expect(html).toContain("/games/:slug");
    expect(html).toContain('id="statuses"');
    expect(html).toContain("/rankings");
    expect(html).toContain('"scenario":"general"');
    expect(html).toContain("wall p50 / p90 / p95");
    expect(html).toContain("db clock p50 / p90 / p95");
    expect(html).toContain("db sum p50 / p90 / p95");
    expect(html).toContain("select count(*) from games");
    expect(html).toContain('id="trips"');
    expect(html).not.toContain("</script></script>");
  });

  it("escapes a path that looks like a script tag", () => {
    const html = formatLoadHtmlReport({
      ...stats,
      samples: [
        {
          group: "general",
          step: "</script><img>",
          status: 200,
          ms: 10,
          ok: true,
        },
      ],
    });
    expect(html).toContain("\\u003c/script>");
    expect(html).not.toMatch(/<script>[\s\S]*<\/script><img>/);
  });
});
