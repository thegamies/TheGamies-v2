/**
 * Staging-only: Better Auth scale users (signed-in), public scale communities,
 * complete community Pick’em sheets, and open GOTY editions with ballots.
 * Default 50 communities × 50 shared Auth users.
 */
import { neon } from "@neondatabase/serverless";
import { createDb } from "@thegamies/db";
import type { NeonSql } from "@/lib/auth/neon-sql";
import {
  PICKEM_SCALE_DEFAULT_COMMUNITIES,
  PICKEM_SCALE_DEFAULT_USERS,
  PICKEM_SCALE_DEFAULT_YEAR,
  parsePickemScaleCommunities,
  parsePickemScaleUsers,
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
  let communities = PICKEM_SCALE_DEFAULT_COMMUNITIES;
  let users = PICKEM_SCALE_DEFAULT_USERS;
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
      } else if (arg === "--communities") {
        const parsed = parsePickemScaleCommunities(next);
        if (typeof parsed !== "number") return parsed;
        communities = parsed;
      } else {
        const parsed = parsePickemScaleUsers(next);
        if (typeof parsed !== "number") return parsed;
        users = parsed;
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
  const query = neon(target.databaseUrl) as unknown as NeonSql;
  if (args.purge) {
    const removed = await purgePickemScale(db, query);
    log(
      `removed ${removed.communities} communities, ${removed.profiles} profiles, ${removed.authUsers} auth users`,
    );
    return;
  }

  log(
    `year ${args.year}, ${args.communities} communities × ${args.users} Better Auth users (Pick’em + editions)`,
  );
  const result = await seedPickemScale(
    {
      year: args.year,
      communities: args.communities,
      users: args.users,
      target: { appUrl: target.appUrl },
      password: target.password,
      query,
    },
    db,
    log,
  );
  log(
    `done: ${result.communities} communities, ${result.users} users, ${result.sheets} sheets, ${result.editionBallots} edition ballots, ${result.editionHosts} hosts`,
  );
}

main().catch((error: unknown) => {
  console.error(
    `qa-pickem-scale: failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
