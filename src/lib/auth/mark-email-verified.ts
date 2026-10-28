import { neon } from "@neondatabase/serverless";
import type { NeonSql } from "./neon-sql";

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

function defaultQuery(): NeonSql {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Database is not configured.");
  }
  return neon(databaseUrl) as unknown as NeonSql;
}

async function optional(run: () => Promise<unknown>): Promise<unknown> {
  try {
    return await run();
  } catch {
    return null;
  }
}

/**
 * Mark a Better Auth user verified in `auth_user` so local sign-up can skip mail.
 */
export async function markAuthEmailVerified(input: {
  authUserId?: string;
  email?: string;
  query?: NeonSql;
}): Promise<boolean> {
  const authUserId = input.authUserId?.trim();
  const email = input.email?.trim();
  if (!authUserId && !email) return false;

  const query = input.query ?? defaultQuery();

  if (authUserId) {
    await optional(
      () =>
        query`UPDATE auth_user SET "emailVerified" = true WHERE id = ${authUserId}`,
    );
    const user = await optional(
      () =>
        query`SELECT id FROM auth_user WHERE id = ${authUserId} AND "emailVerified" = true`,
    );
    return hasRow(user);
  }

  await optional(
    () =>
      query`UPDATE auth_user SET "emailVerified" = true WHERE lower(email) = lower(${email})`,
  );
  const user = await optional(
    () =>
      query`SELECT id FROM auth_user WHERE lower(email) = lower(${email}) AND "emailVerified" = true`,
  );
  return hasRow(user);
}
