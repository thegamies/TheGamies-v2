import type { LoadtestScenario } from "@/lib/qa/loadtest";
import { parseMeteredDbTripsHeader } from "@thegamies/db/request-cost";

export type LoadSample = {
  group: string;
  /** GET path or write op (`list`, `library`, `ballot`, `pickem`). */
  step: string;
  status: number;
  /** Load-runner HTTP round trip. */
  ms: number;
  ok: boolean;
  /** Worker handler time from `x-cost-wall-ms` (staging meter). */
  wallMs?: number;
  /** Neon HTTP wait from `x-cost-db-ms` (sum of overlapping trips). */
  dbMs?: number;
  /** Overlap-union of Neon trips (`x-cost-db-span-ms`). Real db clock. */
  dbSpanMs?: number;
  dbTrips?: number;
  trips?: Array<{ ms: number; sql: string }>;
};

export function readLoadCostHeaders(headers: Headers): {
  wallMs?: number;
  dbMs?: number;
  dbSpanMs?: number;
  dbTrips?: number;
  trips?: Array<{ ms: number; sql: string }>;
} {
  const wallMs = parseHeaderInt(headers.get("x-cost-wall-ms"));
  const dbMs = parseHeaderInt(headers.get("x-cost-db-ms"));
  const dbSpanMs = parseHeaderInt(headers.get("x-cost-db-span-ms"));
  const dbTrips = parseHeaderInt(headers.get("x-cost-db-trips"));
  const trips = parseMeteredDbTripsHeader(
    headers.get("x-cost-db-trip-detail"),
  );
  return {
    ...(wallMs != null ? { wallMs } : {}),
    ...(dbMs != null ? { dbMs } : {}),
    ...(dbSpanMs != null ? { dbSpanMs } : {}),
    ...(dbTrips != null ? { dbTrips } : {}),
    ...(trips ? { trips } : {}),
  };
}

function parseHeaderInt(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

export type LoadMsBand = {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
};

export type LoadLatencySummary = {
  label: string;
  n: number;
  ok: number;
  errors: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  wall: LoadMsBand | null;
  db: LoadMsBand | null;
  dbSpan: LoadMsBand | null;
};

export type LoadRunStats = {
  scenario: LoadtestScenario;
  durationMs: number;
  vusRead: number;
  writers: number;
  startedAt: string;
  endedAt: string;
  samples: LoadSample[];
};

export function percentile(sortedMs: number[], p: number): number {
  if (sortedMs.length === 0) return 0;
  const rank = Math.min(
    sortedMs.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedMs.length) - 1),
  );
  return sortedMs[rank]!;
}

export function msBand(sortedMs: number[]): LoadMsBand {
  return {
    p50: percentile(sortedMs, 50),
    p90: percentile(sortedMs, 90),
    p95: percentile(sortedMs, 95),
    p99: percentile(sortedMs, 99),
    max: sortedMs[sortedMs.length - 1] ?? 0,
  };
}

function optionalMsBand(
  samples: LoadSample[],
  key: "wallMs" | "dbMs" | "dbSpanMs",
): LoadMsBand | null {
  const values = samples
    .map((s) => s[key])
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  return msBand(values);
}

function formatMsBand(band: LoadMsBand): string {
  return `p50 ${band.p50} ms · p90 ${band.p90} ms · p95 ${band.p95} ms`;
}

export function latencySummary(
  samples: LoadSample[],
  label = "all",
): LoadLatencySummary {
  const latencies = samples.map((s) => s.ms).sort((a, b) => a - b);
  const client = msBand(latencies);
  const ok = samples.filter((s) => s.ok).length;
  return {
    label,
    n: samples.length,
    ok,
    errors: samples.length - ok,
    ...client,
    wall: optionalMsBand(samples, "wallMs"),
    db: optionalMsBand(samples, "dbMs"),
    dbSpan: optionalMsBand(samples, "dbSpanMs"),
  };
}

export type LoadTripSummary = {
  sql: string;
  n: number;
  p50: number;
  p90: number;
  p95: number;
  max: number;
};

export function summarizeLoadTrips(samples: LoadSample[]): LoadTripSummary[] {
  const buckets = new Map<string, number[]>();
  for (const sample of samples) {
    for (const trip of sample.trips ?? []) {
      const list = buckets.get(trip.sql);
      if (list) list.push(trip.ms);
      else buckets.set(trip.sql, [trip.ms]);
    }
  }
  return [...buckets.entries()]
    .map(([sql, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        sql,
        n: sorted.length,
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        p95: percentile(sorted, 95),
        max: sorted[sorted.length - 1] ?? 0,
      };
    })
    .sort((a, b) => b.p50 - a.p50 || b.n - a.n);
}

/** Roll `/games/portal-2` into `/games/:slug`; leave `/games` and writes as-is. */
export function loadStepFamily(step: string): string {
  if (step.startsWith("/games/") && step.length > "/games/".length) {
    return "/games/:slug";
  }
  return step;
}

export function partitionLoadSamples(
  samples: LoadSample[],
  key: "group" | "step" | "status" | "family",
): LoadLatencySummary[] {
  const buckets = new Map<string, LoadSample[]>();
  for (const sample of samples) {
    const label =
      key === "status"
        ? String(sample.status)
        : key === "family"
          ? loadStepFamily(sample.step)
          : sample[key];
    const list = buckets.get(label);
    if (list) list.push(sample);
    else buckets.set(label, [sample]);
  }
  const labels = [...buckets.keys()];
  if (key === "status") {
    labels.sort((a, b) => Number(a) - Number(b));
  } else {
    labels.sort((a, b) => a.localeCompare(b));
  }
  return labels.map((label) => latencySummary(buckets.get(label) ?? [], label));
}

function summaryLines(rows: LoadLatencySummary[]): string {
  return rows
    .map(
      (row) =>
        `- ${row.label}: ${row.n} · p50 ${row.p50} ms · p90 ${row.p90} ms · p95 ${row.p95} ms · max ${row.max} ms`,
    )
    .join("\n");
}

export function formatLoadReport(stats: LoadRunStats): string {
  const { samples } = stats;
  const all = latencySummary(samples);
  const elapsedSec = Math.max(0.001, stats.durationMs / 1000);
  const rps = samples.length / elapsedSec;
  const groupLines = summaryLines(partitionLoadSamples(samples, "group"));
  const stepLines = summaryLines(partitionLoadSamples(samples, "family"));
  const statusLines = summaryLines(partitionLoadSamples(samples, "status"));
  const tripLines = summarizeLoadTrips(samples)
    .slice(0, 25)
    .map(
      (row) =>
        `- ${row.sql}: ${row.n} · p50 ${row.p50} ms · p90 ${row.p90} ms · p95 ${row.p95} ms · max ${row.max} ms`,
    )
    .join("\n");

  return `# Load test ${stats.scenario}

- Duration: ${Math.round(stats.durationMs / 1000)}s
- Readers (vus-read): ${stats.vusRead}
- Writers: ${stats.writers}
- Started (UTC): ${stats.startedAt}
- Ended (UTC): ${stats.endedAt}

Copy the UTC window into Neon CU-hours and Cloudflare Worker CPU for \`thegamies-v2-develop\`.

## Traffic

- Requests: ${all.n}
- Success: ${all.ok}
- Errors: ${all.errors}
- RPS: ${rps.toFixed(2)}
- Client ${formatMsBand(all)} · max ${all.max} ms
${all.wall ? `- Worker wall ${formatMsBand(all.wall)} · max ${all.wall.max} ms\n` : ""}${all.dbSpan ? `- Neon db clock ${formatMsBand(all.dbSpan)} · max ${all.dbSpan.max} ms (overlap union)\n` : ""}${all.db ? `- Neon db sum ${formatMsBand(all.db)} · max ${all.db.max} ms (work; parallel trips add)\n` : ""}

## By group

${groupLines || "- (none)"}

## By path / op

${stepLines || "- (none)"}

## By status

${statusLines || "- (none)"}

## Neon trips (SQL fingerprint)

${tripLines || "- (none — needs staging meter trip headers)"}
`;
}
