function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isHostedDeploy(env: Record<string, string | undefined>): boolean {
  if (env.CF_PAGES || env.CF_PAGES_URL) return true;
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) return false;
  try {
    const hostname = new URL(appUrl).hostname.toLowerCase();
    if (isLoopbackHost(hostname)) return false;
    return (
      hostname.endsWith(".workers.dev") ||
      hostname === "thegamies.gg" ||
      hostname.endsWith(".thegamies.gg")
    );
  } catch {
    return true;
  }
}

/**
 * Skip confirm-email only on local `next dev` (Node cannot send Auth mail).
 * Pull-request previews, develop/staging, and production still require it.
 */
export function skipEmailVerification(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.NODE_ENV !== "development") return false;
  if (isHostedDeploy(env)) return false;
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) return true;
  try {
    return isLoopbackHost(new URL(appUrl).hostname);
  } catch {
    return false;
  }
}
