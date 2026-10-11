import {
  LOADTEST_SCENARIOS,
  LOADTEST_WRITERS_MAX,
  isLoadtestScenario,
  parseWriterCount,
  type LoadtestScenario,
} from "@/lib/qa/loadtest";
import { isProductionAppHost } from "@/lib/qa/staging-fixtures";

export const DEFAULT_LOAD_DURATION_MS = 10 * 60 * 1000;
export const DEFAULT_LOAD_VUS_READ = 20;
/** Linear VU start, like k6 `ramping-vus`. `0` starts every loop at t=0. */
export const DEFAULT_LOAD_RAMP_MS = 30_000;
export const MAX_LOAD_DURATION_MS = 60 * 60 * 1000;

export type LoadCliArgs = {
  scenarios: LoadtestScenario[];
  durationMs: number;
  rampMs: number;
  vusRead: number;
  writers: number;
};

/** VU `index` of `total` starts this many ms into the run. Index 0 is immediate. */
export function loadVuStartOffsetMs(
  index: number,
  total: number,
  rampMs: number,
): number {
  if (index <= 0 || total <= 1 || rampMs <= 0) return 0;
  return Math.floor((index / total) * rampMs);
}

export function parseDurationMs(raw: string): number | { error: string } {
  const trimmed = raw.trim().toLowerCase();
  const match = /^(\d+)(ms|s|m|h)?$/.exec(trimmed);
  if (!match) return { error: "Duration must look like 10m, 30s, or 600." };
  const n = Number(match[1]);
  const unit = match[2] ?? "s";
  const ms =
    unit === "ms"
      ? n
      : unit === "s"
        ? n * 1000
        : unit === "m"
          ? n * 60 * 1000
          : n * 60 * 60 * 1000;
  if (ms < 1_000) return { error: "Duration must be at least 1s." };
  if (ms > MAX_LOAD_DURATION_MS) {
    return { error: "Duration cannot exceed 60m." };
  }
  return ms;
}

export function parseRampMs(raw: string): number | { error: string } {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "0" || trimmed === "0s" || trimmed === "0ms") return 0;
  const parsed = parseDurationMs(raw);
  if (typeof parsed !== "number") {
    return { error: "Ramp must look like 30s, 0, or 1m." };
  }
  return parsed;
}

export function parseLoadArgs(argv: string[]): LoadCliArgs | { error: string } {
  let durationMs = DEFAULT_LOAD_DURATION_MS;
  let rampMs = DEFAULT_LOAD_RAMP_MS;
  let vusRead = DEFAULT_LOAD_VUS_READ;
  let writers = 0;
  let all = false;
  const scenarios: LoadtestScenario[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = argv[i + 1];
    if (arg === "--all") {
      all = true;
      continue;
    }
    if (
      arg === "--scenario" ||
      arg === "--duration" ||
      arg === "--ramp" ||
      arg === "--vus-read" ||
      arg === "--writers"
    ) {
      if (next == null || next.startsWith("--")) {
        return { error: `${arg} needs a value.` };
      }
      i += 1;
      if (arg === "--scenario") {
        if (!isLoadtestScenario(next)) {
          return { error: `Unknown scenario '${next}'.` };
        }
        scenarios.push(next);
      } else if (arg === "--duration") {
        const parsed = parseDurationMs(next);
        if (typeof parsed !== "number") return parsed;
        durationMs = parsed;
      } else if (arg === "--ramp") {
        const parsed = parseRampMs(next);
        if (typeof parsed !== "number") return parsed;
        rampMs = parsed;
      } else if (arg === "--vus-read") {
        const n = Number(next);
        if (!Number.isInteger(n) || n < 0 || n > 500) {
          return { error: "vus-read must be an integer from 0 to 500." };
        }
        vusRead = n;
      } else {
        const parsed = parseWriterCount(next);
        if (typeof parsed !== "number") return parsed;
        writers = parsed;
      }
      continue;
    }
    if (arg.startsWith("--")) {
      return { error: `Unknown flag ${arg}.` };
    }
  }

  const resolved = all
    ? [...LOADTEST_SCENARIOS]
    : scenarios.length > 0
      ? scenarios
      : (["general"] as LoadtestScenario[]);

  return { scenarios: resolved, durationMs, rampMs, vusRead, writers };
}

export function refuseLoadAppUrl(appUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(appUrl);
  } catch {
    return "App URL is not valid.";
  }
  if (url.protocol !== "https:") return "App URL must use https.";
  if (isProductionAppHost(url.hostname)) {
    return "Refusing to load-test a production host.";
  }
  return null;
}

export { LOADTEST_WRITERS_MAX };
