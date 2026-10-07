/**
 * Mark a disposable database so `pnpm test:integration` may write to it.
 * CI marks its throwaway branch automatically. Locally, mark your personal
 * Neon branch once. Never mark staging or production.
 *
 * Usage: pnpm test:integration:mark --confirm-test-database
 * Env: INTEGRATION_DATABASE_URL (or DATABASE_URL). Prints the host only.
 */
import { neon } from "@neondatabase/serverless";
import {
  describeDatabaseHost,
  integrationDatabaseUrl,
  INTEGRATION_MARKER_SCHEMA,
  INTEGRATION_MARKER_TABLE,
} from "@/test/integration/guard";

async function main() {
  if (!process.argv.includes("--confirm-test-database")) {
    console.error(
      "integration-mark: pass --confirm-test-database to mark this database as disposable.",
    );
    process.exit(2);
  }
  const url = integrationDatabaseUrl(process.env);
  if (!url) {
    console.error("integration-mark: INTEGRATION_DATABASE_URL (or DATABASE_URL) is required.");
    process.exit(1);
  }
  const sql = neon(url);
  await sql.query(`CREATE SCHEMA IF NOT EXISTS ${INTEGRATION_MARKER_SCHEMA}`);
  await sql.query(
    `CREATE TABLE IF NOT EXISTS ${INTEGRATION_MARKER_TABLE} (marked_at timestamptz NOT NULL DEFAULT now())`,
  );
  await sql.query(
    `INSERT INTO ${INTEGRATION_MARKER_TABLE} (marked_at) SELECT now() WHERE NOT EXISTS (SELECT 1 FROM ${INTEGRATION_MARKER_TABLE})`,
  );
  console.log(`integration-mark: marked ${describeDatabaseHost(url)} as a test database.`);
}

main().catch((error) => {
  console.error(`integration-mark: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
