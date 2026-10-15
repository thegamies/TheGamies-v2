/**
 * Join cost-journey browser records (e2e/.cost/*.json) with the Worker's
 * `request_cost` log lines captured by `wrangler tail --format json`.
 *
 *   pnpm cost:report [--tail e2e/.cost/tail.json]
 *
 * Writes e2e/.cost/report.md and prints it. See docs/request-cost.md.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  formatJourneyReport,
  parseTailOutput,
  summarizeStep,
  type JourneyRun,
} from "@/lib/request-cost/report";

const COST_DIR = path.resolve("e2e/.cost");

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const tailPath = path.resolve(argValue("--tail") ?? path.join(COST_DIR, "tail.json"));
if (!existsSync(COST_DIR)) {
  console.error("No e2e/.cost directory. Run pnpm cost:journeys first.");
  process.exit(1);
}

const runs = readdirSync(COST_DIR)
  .filter((f) => f.endsWith(".json") && f !== path.basename(tailPath))
  .map((f) => JSON.parse(readFileSync(path.join(COST_DIR, f), "utf8")) as JourneyRun)
  .filter((r) => Array.isArray(r.steps));

if (runs.length === 0) {
  console.error("No journey files in e2e/.cost. Run pnpm cost:journeys first.");
  process.exit(1);
}

const records = existsSync(tailPath)
  ? parseTailOutput(readFileSync(tailPath, "utf8"))
  : [];
if (records.length === 0) {
  console.warn(
    `No request_cost lines in ${tailPath}; Worker columns fall back to browser estimates.`,
  );
}

const sections = runs.map((run) =>
  formatJourneyReport(
    run,
    run.steps.map((step) => summarizeStep(step, run.tag, records)),
  ),
);
const md = [
  "# Request cost report",
  "",
  "DB KB is decoded Neon response bytes (an upper bound on billed transfer).",
  "CPU ms shows only when the tail events carry it; otherwise read CPU time",
  "for the same run tag from Workers Logs.",
  "",
  ...sections,
].join("\n");

writeFileSync(path.join(COST_DIR, "report.md"), md);
console.log(md);
