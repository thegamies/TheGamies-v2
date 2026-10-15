/**
 * Staging-only: seed is_seed profiles (no Neon Auth), public Pick’em
 * communities, memberships, and complete community sheets.
 * Default 1000 communities × 1000 shared users (1M sheets).
 */
import { createDb } from "@thegamies/db";
import {
  PICKEM_SCALE_DEFAULT_YEAR,
  PICKEM_SCALE_MAX,
  parsePickemScaleCount,
} from "@/lib/qa/pickem-scale";
import {
  purgePickemScale,
  seedPickemScale,
} from "@/lib/qa/pickem-scale-seed";
import { resolveQaTarget } from "@/lib/qa/staging-fixtures";

function log(message: string) {
  console.log(`qa-pickem-scale: ${message}`);
}

function parseArgs(argv: string[]): {
  purge: boolean;
  year: number;
  communities: number;
  users: number;
} | { error: string } {
  let purge = false;
  let year = PICKEM_SCALE_DEFAULT_YEAR;
  let communities = PICKEM_SCALE_MAX;
  let users = PICKEM_SCALE_MAX;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = argv[i + 1];
    if (arg === "--" || arg === "--purge") {
      if (arg === "--purge") purge = true;
      continue;
    }
    if (arg === "--year" || arg === "--communities" || arg === "--users") {
      if (next == null || next.startsWith("--")) {
        return { error: `${arg} needs a value.` };
      }
      i += 1;
      if (arg === "--year") {
        const n = Number(next);
        if (!Number.isInteger(n) || n < 1970 || n > 2100) {
          return { error: "Year must be a calendar year." };
        }
        year = n;
      } else {
        const parsed = parsePickemScaleCount(
          next,
          arg === "--communities" ? "Communities" : "Users",
        );
        if (typeof parsed !== "number") return parsed;
        if (arg === "--communities") communities = parsed;
        else users = parsed;
      }
    }
  }
  return { purge, year, communities, users };
}

async function main() {
  const target = resolveQaTarget(process.env);
  if ("error" in target) throw new Error(target.error);
  const args = parseArgs(process.argv.slice(2));
  if ("error" in args) throw new Error(args.error);

  const db = createDb(target.databaseUrl);
  if (args.purge) {
    const removed = await purgePickemScale(db);
    log(`removed ${removed.communities} communities, ${removed.profiles} profiles`);
    return;
  }

  log(
    `year ${args.year}, ${args.communities} communities × ${args.users} seed users (no auth)`,
  );
  const result = await seedPickemScale(args, db, log);
  log(
    `done: ${result.communities} communities, ${result.users} users, ${result.sheets} sheets`,
  );
}

main().catch((error: unknown) => {
  console.error(
    `qa-pickem-scale: failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
