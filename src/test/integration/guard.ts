/**
 * Integration tests write rows, so they only run against a database that was
 * explicitly marked as disposable (`integration.marker` exists). Staging and
 * production are never marked.
 */
export const INTEGRATION_MARKER_SCHEMA = "integration";
export const INTEGRATION_MARKER_TABLE = `${INTEGRATION_MARKER_SCHEMA}.marker`;

export const CI_INTEGRATION_BRANCH_PREFIX = "ci/integration-";

export function integrationDatabaseUrl(
  env: Record<string, string | undefined>,
): string | null {
  const url = (env.INTEGRATION_DATABASE_URL ?? env.DATABASE_URL)?.trim();
  return url ? url : null;
}

/** Host only — never print credentials. */
export function describeDatabaseHost(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).hostname || "(unknown host)";
  } catch {
    return "(unparseable URL)";
  }
}

export function isCiIntegrationBranch(
  env: Record<string, string | undefined>,
): boolean {
  const name = env.INTEGRATION_BRANCH_NAME?.trim() ?? "";
  return (
    env.CI === "true" &&
    name.startsWith(CI_INTEGRATION_BRANCH_PREFIX) &&
    name.length > CI_INTEGRATION_BRANCH_PREFIX.length
  );
}
