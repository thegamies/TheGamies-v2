import { neon } from "@neondatabase/serverless";
import { isSelfHostedAuthEnabled } from "@/lib/auth/self-hosted-env";
import type { NeonSql } from "./remove-neon-auth-user";

function rowsOf(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: unknown[] }).rows;
  }
  return [];
}

function isUndefinedRelation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /42P01|does not exist|undefined_table/i.test(message);
}

function defaultQuery(): NeonSql {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Database is not configured.");
  }
  return neon(databaseUrl) as unknown as NeonSql;
}

/**
 * True when Auth has an email/password credential for this user.
 * Google-only accounts have no password until they use Forgot password.
 * Missing account table fails open so password deletes still work.
 */
export async function hasPasswordCredential(
  authUserId: string,
  options?: { query?: NeonSql },
): Promise<boolean> {
  if (!authUserId.trim()) return false;
  const query = options?.query ?? defaultQuery();
  const table = isSelfHostedAuthEnabled()
    ? "auth_account"
    : 'neon_auth.account';
  try {
    const result =
      table === "auth_account"
        ? await query`
            SELECT 1
            FROM auth_account
            WHERE "userId" = ${authUserId}
              AND "providerId" = 'credential'
            LIMIT 1
          `
        : await query`
            SELECT 1
            FROM neon_auth.account
            WHERE "userId" = ${authUserId}
              AND "providerId" = 'credential'
            LIMIT 1
          `;
    return rowsOf(result).length > 0;
  } catch (err) {
    if (isUndefinedRelation(err)) return true;
    throw err;
  }
}
