/**
 * Rebuild load HTML from a saved samples JSON.
 * Usage: pnpm exec tsx scripts/cost/render-load-html.ts e2e/.cost/load-….json
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatLoadHtmlReport } from "@/lib/request-cost/load-html-report";
import { formatLoadReport, type LoadRunStats } from "@/lib/request-cost/load-report";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Pass a load-*.json path.");
  const stats = JSON.parse(await readFile(file, "utf8")) as LoadRunStats;
  const dir = path.dirname(file);
  const stem = path.basename(file, ".json");
  await writeFile(path.join(dir, `${stem}.html`), formatLoadHtmlReport(stats));
  await writeFile(path.join(dir, `${stem}.md`), formatLoadReport(stats));
  console.log(`wrote ${stem}.html`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
