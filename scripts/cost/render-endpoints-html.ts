/**
 * Standalone routes HTML (same idea as load-*.html). Not part of the app build.
 * Usage: pnpm exec tsx scripts/cost/render-endpoints-html.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatEndpointsHtml } from "@/lib/site-endpoints/html-report";

async function main() {
  const dir = path.resolve("e2e/.cost");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "endpoints.html");
  await writeFile(file, formatEndpointsHtml());
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
