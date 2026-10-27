/**
 * Self-hosted Better Auth is on when `BETTER_AUTH_SECRET` is set (32+ chars)
 * and `DATABASE_URL` is present. Prefers this over Neon Managed Auth.
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

export function useSelfHostedAuth(): boolean {
  return readSelfHostedAuthEnv() !== null;
}

/** Build-time / client flag. Set `NEXT_PUBLIC_SELF_HOSTED_AUTH=1` with the secret. */
export function useSelfHostedAuthClient(): boolean {
  return process.env.NEXT_PUBLIC_SELF_HOSTED_AUTH === "1";
}
