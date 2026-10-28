/**
 * Better Auth is configured when `BETTER_AUTH_SECRET` is set (32+ chars)
 * and `DATABASE_URL` is present.
 */
export function readSelfHostedAuthEnv(): {
  secret: string;
  baseURL: string;
  databaseUrl: string;
} | null {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!secret || secret.length < 32 || !databaseUrl) {
    return null;
  }
  const baseURL =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  return { secret, baseURL, databaseUrl };
}

export function isSelfHostedAuthEnabled(): boolean {
  return readSelfHostedAuthEnv() !== null;
}
