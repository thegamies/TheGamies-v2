import { neon } from "@neondatabase/serverless";
import {
  describeDatabaseHost,
  integrationDatabaseUrl,
  INTEGRATION_MARKER_TABLE,
} from "./guard";

export default async function setup() {
  const url = integrationDatabaseUrl(process.env);
  if (!url) {
    throw new Error(
      "Integration tests need INTEGRATION_DATABASE_URL (or DATABASE_URL) pointing at a disposable test database.",
    );
  }
  const host = describeDatabaseHost(url);
  const sql = neon(url);
  const rows = (await sql.query("SELECT to_regclass($1) AS marker", [
    INTEGRATION_MARKER_TABLE,
  ])) as Array<{ marker: string | null }>;
  if (!rows[0]?.marker) {
    throw new Error(
      `Refusing to run: ${host} is not marked as a test database. Mark a disposable branch with pnpm test:integration:mark --confirm-test-database (never staging or production).`,
    );
  }
  console.log(`integration: running against ${host}`);
}
