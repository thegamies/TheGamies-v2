import type { LoadtestScenario } from "@/lib/qa/loadtest";

export type LoadSample = {
  group: string;
  status: number;
  ms: number;
  ok: boolean;
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

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function formatLoadReport(stats: LoadRunStats): string {
  const { samples } = stats;
  const ok = samples.filter((s) => s.ok);
  const failed = samples.filter((s) => !s.ok);
  const latencies = [...samples.map((s) => s.ms)].sort((a, b) => a - b);
  const elapsedSec = Math.max(0.001, stats.durationMs / 1000);
  const rps = samples.length / elapsedSec;
  const byGroup = countBy(samples, (s) => s.group);
  const byStatus = countBy(samples, (s) => String(s.status));
  const groupLines = Object.entries(byGroup)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, n]) => `- ${group}: ${n}`)
    .join("\n");
  const statusLines = Object.entries(byStatus)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([status, n]) => `- ${status}: ${n}`)
    .join("\n");

  return `# Load test ${stats.scenario}

- Duration: ${Math.round(stats.durationMs / 1000)}s
- Readers (vus-read): ${stats.vusRead}
- Writers: ${stats.writers}
- Started (UTC): ${stats.startedAt}
- Ended (UTC): ${stats.endedAt}

Copy the UTC window into Neon CU-hours and Cloudflare Worker CPU for \`thegamies-v2-develop\`.

## Traffic

- Requests: ${samples.length}
- Success: ${ok.length}
- Errors: ${failed.length}
- RPS: ${rps.toFixed(2)}
- Latency p50: ${percentile(latencies, 50)} ms
- Latency p95: ${percentile(latencies, 95)} ms
- Latency max: ${latencies[latencies.length - 1] ?? 0} ms

## By group

${groupLines || "- (none)"}

## By status

${statusLines || "- (none)"}
`;
}
