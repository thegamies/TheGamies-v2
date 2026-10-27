import { neon } from "@neondatabase/serverless";
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

function hasRow(result: unknown): boolean {
  return rowsOf(result).length > 0;
}

function isUndefinedRelation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /42P01|does not exist|undefined_table/i.test(message);
}

async function optional(run: () => Promise<unknown>): Promise<unknown> {
  try {
    return await run();
  } catch (err) {
    if (isUndefinedRelation(err)) return null;
    throw err;
  }
}

function defaultQuery(): NeonSql {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Database is not configured.");
  }
  return neon(databaseUrl) as unknown as NeonSql;
}

/**
 * Remove a self-hosted Better Auth user from `auth_*` tables so the email
 * can be used again.
 */
export async function removeSelfHostedAuthUser(
  authUserId: string,
  options?: { query?: NeonSql; email?: string },
): Promise<boolean> {
  if (!authUserId.trim()) return false;

  const query = options?.query ?? defaultQuery();
  const email = options?.email?.trim();

  await optional(
    () => query`DELETE FROM auth_session WHERE "userId" = ${authUserId}`,
  );
  await optional(
    () => query`DELETE FROM auth_account WHERE "userId" = ${authUserId}`,
  );
  if (email) {
    await optional(
      () =>
        query`DELETE FROM auth_verification WHERE identifier = ${email}`,
    );
  }
  await optional(() => query`DELETE FROM auth_user WHERE id = ${authUserId}`);

  const remaining = await optional(
    () => query`SELECT id FROM auth_user WHERE id = ${authUserId}`,
  );
  return !hasRow(remaining);
}
