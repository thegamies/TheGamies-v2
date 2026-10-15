/**
 * Empty a freshly created CI Neon branch so migrations run from zero and no
 * staging rows remain. CI only: refuses unless CI=true and
 * INTEGRATION_BRANCH_NAME starts with `ci/integration-`.
 *
 * Env: INTEGRATION_DATABASE_URL, INTEGRATION_BRANCH_NAME, CI.
 */
import { neon } from "@neondatabase/serverless";
import { describeDatabaseHost, isCiIntegrationBranch } from "@/test/integration/guard";

async function main() {
  if (!isCiIntegrationBranch(process.env)) {
    console.error(
      "integration-reset: refusing — only runs in CI on a ci/integration-* branch.",
    );
    process.exit(2);
  }
  const url = process.env.INTEGRATION_DATABASE_URL?.trim();
  if (!url) {
    console.error("integration-reset: INTEGRATION_DATABASE_URL is required.");
    process.exit(1);
  }
  const sql = neon(url);
  await sql.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await sql.query("DROP SCHEMA IF EXISTS public CASCADE");
  await sql.query("CREATE SCHEMA public");
  console.log(`integration-reset: emptied ${describeDatabaseHost(url)}.`);
}

main().catch((error) => {
  console.error(`integration-reset: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
