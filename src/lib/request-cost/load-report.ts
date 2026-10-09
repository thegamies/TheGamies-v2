import type { LoadtestScenario } from "@/lib/qa/loadtest";

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
  dbTrips?: number;
};

export function readLoadCostHeaders(headers: Headers): {
  wallMs?: number;
  dbMs?: number;
  dbTrips?: number;
} {
  const wallMs = parseHeaderInt(headers.get("x-cost-wall-ms"));
  const dbMs = parseHeaderInt(headers.get("x-cost-db-ms"));
  const dbTrips = parseHeaderInt(headers.get("x-cost-db-trips"));
  return {
    ...(wallMs != null ? { wallMs } : {}),
    ...(dbMs != null ? { dbMs } : {}),
    ...(dbTrips != null ? { dbTrips } : {}),
  };
}

function parseHeaderInt(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

export type LoadLatencySummary = {
  label: string;
  n: number;
  ok: number;
  errors: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  wallP50: number | null;
  dbP50: number | null;
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

function optionalMsP50(samples: LoadSample[], key: "wallMs" | "dbMs"): number | null {
  const values = samples
    .map((s) => s[key])
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  return percentile(values, 50);
}

export function latencySummary(
  samples: LoadSample[],
  label = "all",
): LoadLatencySummary {
  const latencies = samples.map((s) => s.ms).sort((a, b) => a - b);
  const ok = samples.filter((s) => s.ok).length;
  return {
    label,
    n: samples.length,
    ok,
    errors: samples.length - ok,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] ?? 0,
    wallP50: optionalMsP50(samples, "wallMs"),
    dbP50: optionalMsP50(samples, "dbMs"),
  };
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
        `- ${row.label}: ${row.n} · p50 ${row.p50} ms · p95 ${row.p95} ms · max ${row.max} ms`,
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
- Latency p50: ${all.p50} ms
- Latency p95: ${all.p95} ms
- Latency p99: ${all.p99} ms
- Latency max: ${all.max} ms
${all.wallP50 != null ? `- Worker wall p50: ${all.wallP50} ms\n` : ""}${all.dbP50 != null ? `- Neon db wait p50: ${all.dbP50} ms (sum of overlapping round trips)\n` : ""}

## By group

${groupLines || "- (none)"}

## By path / op

${stepLines || "- (none)"}

## By status

${statusLines || "- (none)"}
`;
}
