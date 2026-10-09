import { describe, expect, it } from "vitest";
import type { RequestCostRecord } from "@/lib/cloudflare/request-cost";
import {
  formatJourneyReport,
  parseTailOutput,
  splitJsonValues,
  summarizeStep,
  type JourneyRun,
  type JourneyStep,
} from "./report";

function record(over: Partial<RequestCostRecord>): RequestCostRecord {
  return {
    type: "request_cost",
    journey: "run-1",
    step: "overview",
    kind: "document",
    method: "GET",
    path: "/",
    status: 200,
    responseBytes: 1000,
    wallMs: 50,
    dbRoundTrips: 4,
    dbStatements: 5,
    dbBytes: 2048,
    dbMs: 30,
    ...over,
  };
}

const step: JourneyStep = {
  step: "overview",
  url: "/communities/a/edition/2025?view=overview",
  navigation: "document",
  requests: [
    { kind: "document", url: "/communities/a/edition/2025", status: 200, transferBytes: 900 },
    { kind: "asset", url: "/_next/static/a.js", status: 200, transferBytes: 5000 },
    { kind: "image", url: "/_next/image?url=x&w=96", status: 200, transferBytes: 300 },
    { kind: "image", url: "/_next/image?url=x&w=96", status: 200, transferBytes: 300 },
    { kind: "image", url: "/_next/image?url=y&w=96", status: 200, transferBytes: 300 },
  ],
};

describe("splitJsonValues", () => {
  it("reads pretty-printed and single-line values back to back", () => {
    const text = `{\n  "a": 1,\n  "s": "brace } in \\"string\\""\n}\nnoise\n{"b":{"c":2}}`;
    expect(splitJsonValues(text)).toEqual([
      { a: 1, s: 'brace } in "string"' },
      { b: { c: 2 } },
    ]);
  });
});

describe("parseTailOutput", () => {
  it("keeps request_cost lines and attaches CPU time when the event has it", () => {
    const events = [
      {
        outcome: "ok",
        cpuTime: 12.5,
        logs: [
          { level: "log", message: [JSON.stringify(record({}))] },
          { level: "log", message: ["unrelated"] },
        ],
      },
      { outcome: "ok", logs: [{ level: "log", message: [record({ step: "x" })] }] },
    ];
    const text = events.map((e) => JSON.stringify(e, null, 2)).join("\n");

    const parsed = parseTailOutput(text);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ step: "overview", cpuTimeMs: 12.5 });
    expect(parsed[1]).toMatchObject({ step: "x" });
    expect(parsed[1].cpuTimeMs).toBeUndefined();
  });
});

describe("summarizeStep", () => {
  it("uses Worker records for this journey and step", () => {
    const summary = summarizeStep(step, "run-1", [
      record({}),
      record({ kind: "image", dbRoundTrips: 0, dbStatements: 0, dbBytes: 0 }),
      record({ journey: "other-run" }),
      record({ step: "standings" }),
    ]);

    expect(summary).toMatchObject({
      source: "worker",
      workerRequests: 2,
      workerRequestsByKind: { document: 1, image: 1 },
      dbRoundTrips: 4,
      dbStatements: 5,
      dbBytes: 2048,
      responseBytes: 2000,
      cpuTimeMs: null,
      imageRequests: 3,
      uniqueImages: 2,
      browserTransferBytes: 6800,
    });
  });

  it("falls back to browser counts without static assets", () => {
    const summary = summarizeStep(step, "run-1", []);
    expect(summary).toMatchObject({
      source: "browser",
      workerRequests: 4,
      workerRequestsByKind: { document: 1, image: 3 },
      dbRoundTrips: 0,
    });
  });
});

describe("formatJourneyReport", () => {
  it("renders a table with totals and flags browser estimates", () => {
    const run: JourneyRun = {
      journey: "edition-results",
      viewer: "signed out",
      tag: "run-1",
      baseUrl: "https://staging.test",
      startedAt: "2026-10-08T00:00:00.000Z",
      warmupHits: 3,
      steps: [step],
    };
    const md = formatJourneyReport(run, [summarizeStep(step, "run-1", [])]);
    expect(md).toContain("### edition-results — signed out");
    expect(md).toContain(
      "3 unmetered warm-up hits of the first path before recording.",
    );
    expect(md).toContain("| overview | document | 4* |");
    expect(md).toContain("| **Total** |  | 4 |");
    expect(md).toContain("Browser estimate");
  });
});
