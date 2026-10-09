/**
 * Delete only load-test users, gamies_qa_load, and reserved TGA years.
 * Never touches QA accounts, showcase 2025, or the promoted TGA year.
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { eq, inArray, like } from "drizzle-orm";
import {
  communities,
  createDb,
  profiles,
  tgaYears,
} from "@thegamies/db";
import {
  removeNeonAuthDirectoryUser,
  type NeonSql,
} from "@/lib/auth/remove-neon-auth-user";
import {
  LOADTEST_COMMUNITY,
  LOADTEST_TGA_LOCKED_YEAR,
  LOADTEST_TGA_OPEN_YEAR,
  LOADTEST_USERNAME_PREFIX,
  LOADTEST_WRITERS_MAX,
  loadtestAccount,
} from "@/lib/qa/loadtest";
import { QA_ACCOUNTS, QA_COMMUNITIES, resolveQaTarget } from "@/lib/qa/staging-fixtures";

function log(message: string) {
  console.log(`qa-loadtest-purge: ${message}`);
}

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result;
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? rows : [];
}

async function main() {
  const target = resolveQaTarget(process.env);
  if ("error" in target) throw new Error(target.error);
  const query = neon(target.databaseUrl) as unknown as NeonSql;
  const db = createDb(target.databaseUrl);

  const [promoted] = await db
    .select({ year: tgaYears.year })
    .from(tgaYears)
    .where(eq(tgaYears.promoted, true))
    .limit(1);
  const reserved = [LOADTEST_TGA_OPEN_YEAR, LOADTEST_TGA_LOCKED_YEAR].filter(
    (year) => year !== promoted?.year,
  );
  if (reserved.length > 0) {
    await db.delete(tgaYears).where(inArray(tgaYears.year, reserved));
    log(`removed TGA years ${reserved.join(", ")}`);
  }

  const qaSlugs = new Set<string>(
    Object.values(QA_COMMUNITIES).map((c) => c.slug),
  );
  if (qaSlugs.has(LOADTEST_COMMUNITY.slug)) {
    throw new Error("Load community slug collides with QA fixtures");
  }
  await db
    .delete(communities)
    .where(eq(communities.slug, LOADTEST_COMMUNITY.slug));
  log(`removed community ${LOADTEST_COMMUNITY.slug}`);

  const qaUsernames = new Set<string>(
    Object.values(QA_ACCOUNTS).map((a) => a.username),
  );
  const loadProfiles = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      authUserId: profiles.authUserId,
    })
    .from(profiles)
    .where(like(profiles.username, `${LOADTEST_USERNAME_PREFIX}%`));
  for (const row of loadProfiles) {
    if (qaUsernames.has(row.username)) continue;
    await db.delete(profiles).where(eq(profiles.id, row.id));
    await removeNeonAuthDirectoryUser(row.authUserId, { query });
  }

  for (let index = 1; index <= LOADTEST_WRITERS_MAX; index++) {
    const account = loadtestAccount(index);
    const result =
      await query`SELECT id FROM neon_auth."user" WHERE lower(email) = lower(${account.email}) LIMIT 1`;
    const id = rowsOf(result)[0]?.id;
    if (typeof id === "string") {
      await removeNeonAuthDirectoryUser(id, { query, email: account.email });
    }
  }
  log("removed load-test accounts");

  await rm(path.resolve("e2e/.auth/loadtest"), { recursive: true, force: true });
}

main().catch((error: unknown) => {
  console.error(
    `qa-loadtest-purge: failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
