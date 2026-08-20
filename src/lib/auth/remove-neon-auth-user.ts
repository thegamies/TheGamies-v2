import { neon } from "@neondatabase/serverless";

export type NeonSql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown>;

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

async function authUserExists(
  authUserId: string,
  query: NeonSql,
): Promise<boolean> {
  const user = await optional(
    () => query`SELECT id FROM neon_auth."user" WHERE id = ${authUserId}`,
  );
  const sync = await optional(
    () => query`SELECT id FROM neon_auth.users_sync WHERE id = ${authUserId}`,
  );
  return hasRow(user) || hasRow(sync);
}

/**
 * Remove a Managed Better Auth user from this branch’s `neon_auth` schema.
 * Neon documents the database as the source of truth for users/sessions.
 * https://neon.com/docs/auth/authentication-flow
 */
export async function removeNeonAuthDirectoryUser(
  authUserId: string,
  options?: { query?: NeonSql; email?: string },
): Promise<boolean> {
  if (!authUserId.trim()) return false;

  const query = options?.query ?? defaultQuery();
  const email = options?.email;

  await optional(
    () => query`DELETE FROM neon_auth.session WHERE "userId" = ${authUserId}`,
  );
  await optional(
    () => query`DELETE FROM neon_auth.account WHERE "userId" = ${authUserId}`,
  );
  await optional(
    () => query`DELETE FROM neon_auth.member WHERE "userId" = ${authUserId}`,
  );
  if (email) {
    await optional(
      () =>
        query`DELETE FROM neon_auth.verification WHERE identifier = ${email}`,
    );
  }
  await optional(
    () => query`DELETE FROM neon_auth.users_sync WHERE id = ${authUserId}`,
  );
  await optional(
    () => query`DELETE FROM neon_auth."user" WHERE id = ${authUserId}`,
  );

  return !(await authUserExists(authUserId, query));
}
