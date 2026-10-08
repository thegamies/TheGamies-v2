import {
  REQUEST_COST_LOG_TYPE,
  type RequestCostRecord,
  type RequestKind,
} from "@/lib/cloudflare/request-cost";

export type BrowserRequestKind = RequestKind | "asset";

/** One same-origin request the browser made during a journey step. */
export type BrowserRequest = {
  kind: BrowserRequestKind;
  url: string;
  status: number;
  /** Encoded (on-the-wire) response body size reported by the browser. */
  transferBytes: number;
};

export type JourneyStep = {
  step: string;
  url: string;
  /** `document` = full page load, `client` = in-app navigation. */
  navigation: "document" | "client";
  requests: BrowserRequest[];
};

/** Written by the cost journeys (`e2e/cost`), one file per journey × viewer. */
export type JourneyRun = {
  journey: string;
  viewer: string;
  tag: string;
  baseUrl: string;
  startedAt: string;
  steps: JourneyStep[];
};

export type WorkerRecord = RequestCostRecord & {
  /** Present only if Cloudflare includes it on the tail event. */
  cpuTimeMs?: number;
};

export type StepSummary = {
  step: string;
  navigation: JourneyStep["navigation"];
  workerRequests: number;
  workerRequestsByKind: Partial<Record<RequestKind, number>>;
  dbRoundTrips: number;
  dbStatements: number;
  dbBytes: number;
  responseBytes: number;
  cpuTimeMs: number | null;
  imageRequests: number;
  uniqueImages: number;
  browserTransferBytes: number;
  /** Worker numbers come from tail logs when present, else browser estimates. */
  source: "worker" | "browser";
};

/**
 * Split concatenated JSON values (pretty-printed or one per line), as written
 * by `wrangler tail --format json`. Text outside JSON values is skipped.
 */
export function splitJsonValues(text: string): unknown[] {
  const values: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      if (depth > 0) inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          values.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // Not a complete JSON object; skip it.
        }
        start = -1;
      }
    }
  }
  return values;
}

function asRecord(value: unknown): RequestCostRecord | null {
  let candidate = value;
  if (typeof candidate === "string") {
    if (!candidate.includes(`"${REQUEST_COST_LOG_TYPE}"`)) return null;
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  if (
    candidate &&
    typeof candidate === "object" &&
    (candidate as { type?: unknown }).type === REQUEST_COST_LOG_TYPE
  ) {
    return candidate as RequestCostRecord;
  }
  return null;
}

/** Pull `request_cost` lines out of tail events. */
export function parseTailOutput(text: string): WorkerRecord[] {
  const out: WorkerRecord[] = [];
  for (const event of splitJsonValues(text)) {
    const e = event as {
      logs?: Array<{ message?: unknown[] }>;
      cpuTime?: unknown;
    };
    const cpu = typeof e.cpuTime === "number" ? e.cpuTime : undefined;
    for (const entry of e.logs ?? []) {
      for (const message of entry.message ?? []) {
        const record = asRecord(message);
        if (record) out.push(cpu === undefined ? record : { ...record, cpuTimeMs: cpu });
      }
    }
  }
  return out;
}

const WORKER_KINDS: BrowserRequestKind[] = [
  "document",
  "rsc",
  "action",
  "image",
  "api",
  "other",
];

export function summarizeStep(
  step: JourneyStep,
  tag: string,
  workerRecords: WorkerRecord[],
): StepSummary {
  const images = step.requests.filter((r) => r.kind === "image");
  const browserTransferBytes = step.requests.reduce(
    (sum, r) => sum + r.transferBytes,
    0,
  );
  const worker = workerRecords.filter(
    (r) => r.journey === tag && r.step === step.step,
  );

  const byKind: Partial<Record<RequestKind, number>> = {};
  if (worker.length > 0) {
    for (const r of worker) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
    const cpu = worker.filter((r) => typeof r.cpuTimeMs === "number");
    const sum = (key: keyof DbTotals) =>
      worker.reduce((acc, r) => acc + r[key], 0);
    return {
      step: step.step,
      navigation: step.navigation,
      workerRequests: worker.length,
      workerRequestsByKind: byKind,
      dbRoundTrips: sum("dbRoundTrips"),
      dbStatements: sum("dbStatements"),
      dbBytes: sum("dbBytes"),
      responseBytes: sum("responseBytes"),
      cpuTimeMs:
        cpu.length === worker.length
          ? cpu.reduce((acc, r) => acc + (r.cpuTimeMs ?? 0), 0)
          : null,
      imageRequests: images.length,
      uniqueImages: new Set(images.map((r) => r.url)).size,
      browserTransferBytes,
      source: "worker",
    };
  }

  const hitsWorker = step.requests.filter((r) => WORKER_KINDS.includes(r.kind));
  for (const r of hitsWorker) {
    const kind = r.kind as RequestKind;
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  }
  return {
    step: step.step,
    navigation: step.navigation,
    workerRequests: hitsWorker.length,
    workerRequestsByKind: byKind,
    dbRoundTrips: 0,
    dbStatements: 0,
    dbBytes: 0,
    responseBytes: 0,
    cpuTimeMs: null,
    imageRequests: images.length,
    uniqueImages: new Set(images.map((r) => r.url)).size,
    browserTransferBytes,
    source: "browser",
  };
}

type DbTotals = Pick<
  RequestCostRecord,
  "dbRoundTrips" | "dbStatements" | "dbBytes" | "responseBytes"
>;

function kb(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

export function formatJourneyReport(
  run: JourneyRun,
  steps: StepSummary[],
): string {
  const header = [
    `### ${run.journey} — ${run.viewer}`,
    "",
    `Run \`${run.tag}\` against ${run.baseUrl} at ${run.startedAt}.`,
    "",
    "| Step | Nav | Worker req | DB trips | DB stmts | DB KB | Resp KB | CPU ms | Images (unique) | Browser KB |",
    "|---|---|---|---|---|---|---|---|---|---|",
  ];
  const rows = steps.map((s) =>
    [
      s.step,
      s.navigation,
      `${s.workerRequests}${s.source === "browser" ? "*" : ""}`,
      s.source === "worker" ? String(s.dbRoundTrips) : "—",
      s.source === "worker" ? String(s.dbStatements) : "—",
      s.source === "worker" ? kb(s.dbBytes) : "—",
      s.source === "worker" ? kb(s.responseBytes) : "—",
      s.cpuTimeMs === null ? "—" : s.cpuTimeMs.toFixed(1),
      `${s.imageRequests} (${s.uniqueImages})`,
      kb(s.browserTransferBytes),
    ].join(" | "),
  );
  const total = steps.reduce(
    (acc, s) => ({
      workerRequests: acc.workerRequests + s.workerRequests,
      dbRoundTrips: acc.dbRoundTrips + s.dbRoundTrips,
      dbStatements: acc.dbStatements + s.dbStatements,
      dbBytes: acc.dbBytes + s.dbBytes,
      responseBytes: acc.responseBytes + s.responseBytes,
      imageRequests: acc.imageRequests + s.imageRequests,
      browserTransferBytes: acc.browserTransferBytes + s.browserTransferBytes,
    }),
    {
      workerRequests: 0,
      dbRoundTrips: 0,
      dbStatements: 0,
      dbBytes: 0,
      responseBytes: 0,
      imageRequests: 0,
      browserTransferBytes: 0,
    },
  );
  const hasWorker = steps.some((s) => s.source === "worker");
  rows.push(
    [
      "**Total**",
      "",
      String(total.workerRequests),
      hasWorker ? String(total.dbRoundTrips) : "—",
      hasWorker ? String(total.dbStatements) : "—",
      hasWorker ? kb(total.dbBytes) : "—",
      hasWorker ? kb(total.responseBytes) : "—",
      "",
      String(total.imageRequests),
      kb(total.browserTransferBytes),
    ].join(" | "),
  );
  const footer = steps.some((s) => s.source === "browser")
    ? ["", "\\* Browser estimate: no Worker log lines matched this step."]
    : [];
  return [...header, ...rows.map((r) => `| ${r} |`), ...footer, ""].join("\n");
}
