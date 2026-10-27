import { neon } from "@neondatabase/serverless";
import type { NeonSql } from "./remove-neon-auth-user";
import { isSelfHostedAuthEnabled } from "@/lib/auth/self-hosted-env";

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

async function markSelfHostedVerified(input: {
  authUserId?: string;
  email?: string;
  query: NeonSql;
}): Promise<boolean> {
  const authUserId = input.authUserId?.trim();
  const email = input.email?.trim();
  if (authUserId) {
    await optional(
      () =>
        input.query`UPDATE auth_user SET "emailVerified" = true WHERE id = ${authUserId}`,
    );
    const user = await optional(
      () =>
        input.query`SELECT id FROM auth_user WHERE id = ${authUserId} AND "emailVerified" = true`,
    );
    return hasRow(user);
  }
  if (email) {
    await optional(
      () =>
        input.query`UPDATE auth_user SET "emailVerified" = true WHERE lower(email) = lower(${email})`,
    );
    const user = await optional(
      () =>
        input.query`SELECT id FROM auth_user WHERE lower(email) = lower(${email}) AND "emailVerified" = true`,
    );
    return hasRow(user);
  }
  return false;
}

/**
 * Mark a user verified so local sign-up can skip mail.
 * Self-hosted: `auth_user`. Managed Neon Auth: `neon_auth."user"`.
 */
export async function markNeonAuthEmailVerified(input: {
  authUserId?: string;
  email?: string;
  query?: NeonSql;
}): Promise<boolean> {
  const authUserId = input.authUserId?.trim();
  const email = input.email?.trim();
  if (!authUserId && !email) return false;

  const query = input.query ?? defaultQuery();

  if (isSelfHostedAuthEnabled()) {
    return markSelfHostedVerified({ authUserId, email, query });
  }

  if (authUserId) {
    await optional(
      () =>
        query`UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = ${authUserId}`,
    );
    await optional(
      () =>
        query`UPDATE neon_auth.users_sync SET "emailVerified" = true WHERE id = ${authUserId}`,
    );
    const user = await optional(
      () =>
        query`SELECT id FROM neon_auth."user" WHERE id = ${authUserId} AND "emailVerified" = true`,
    );
    return hasRow(user);
  }

  await optional(
    () =>
      query`UPDATE neon_auth."user" SET "emailVerified" = true WHERE lower(email) = lower(${email})`,
  );
  await optional(
    () =>
      query`UPDATE neon_auth.users_sync SET "emailVerified" = true WHERE lower(email) = lower(${email})`,
  );
  const user = await optional(
    () =>
      query`SELECT id FROM neon_auth."user" WHERE lower(email) = lower(${email}) AND "emailVerified" = true`,
  );
  return hasRow(user);
}
