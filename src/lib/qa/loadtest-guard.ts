import { timingSafeEqualString } from "@thegamies/igdb";
import { getAuthOrNull } from "@/lib/auth/server";
import { getProfileByAuthUserId, getProfileByUsername } from "@/lib/profile/service";
import {
  isLoadtestEmail,
  isLoadtestUsername,
  LOADTEST_WRITER_HEADER,
  loadtestAccount,
  parseLoadtestWriterHeader,
} from "@/lib/qa/loadtest";
import {
  isPickemScaleEmail,
  isPickemScaleUsername,
} from "@/lib/qa/pickem-scale";
import { isProductionAppHost } from "@/lib/qa/staging-fixtures";

const MAX_BODY_BYTES = 32 * 1024;

export function requestHostname(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.toLowerCase();
  try {
    return new URL(request.url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function loadtestSecretFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const secret = env.LOADTEST_SECRET?.trim() ?? "";
  return secret.length > 0 ? secret : null;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/.exec(header);
  return match?.[1] ?? null;
}

export function refuseLoadtestProductionHost(
  request: Request,
): { status: 404; error: string } | null {
  const host = requestHostname(request);
  if (host && isProductionAppHost(host)) {
    return { status: 404, error: "Not found." };
  }
  return null;
}

/**
 * Production hosts always 404 (even if a secret leaked). Missing or wrong
 * secret is 401. Never echoes the secret.
 *
 * Prefer {@link resolveLoadtestWriteActor} for the write route — that accepts
 * a real Auth session cookie first, then this Bearer escape hatch.
 */
export function authorizeLoadtestRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): { ok: true } | { status: 401 | 404; error: string } {
  const refused = refuseLoadtestProductionHost(request);
  if (refused) return refused;
  const expected = loadtestSecretFromEnv(env);
  const received = bearerToken(request);
  if (!expected || !received || !timingSafeEqualString(received, expected)) {
    return { status: 401, error: "Unauthorized." };
  }
  return { ok: true };
}

function isLoadOrScaleEmail(email: string): boolean {
  return isLoadtestEmail(email) || isPickemScaleEmail(email);
}

function isLoadOrScaleUsername(username: string): boolean {
  return isLoadtestUsername(username) || isPickemScaleUsername(username);
}

async function sessionLoadtestUser(
  request: Request,
): Promise<{ id: string; email: string } | null> {
  const auth = getAuthOrNull();
  if (!auth) return null;
  try {
    const session = await auth.$ba.api.getSession({
      headers: request.headers,
    });
    const user = session?.user;
    if (!user?.id || typeof user.email !== "string") return null;
    if (!isLoadOrScaleEmail(user.email)) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

/**
 * Resolve who a staging load-test write runs as.
 *
 * 1. Production host → 404
 * 2. Better Auth session for a load-test `@example.com` user → that profile
 * 3. Else Bearer `LOADTEST_SECRET` + `x-loadtest-writer` → that profile (escape hatch)
 */
export async function resolveLoadtestWriteActor(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): Promise<
  | { ok: true; profileId: string; mode: "session" | "secret" }
  | { status: 400 | 401 | 404; error: string }
> {
  const refused = refuseLoadtestProductionHost(request);
  if (refused) return refused;

  const sessionUser = await sessionLoadtestUser(request);
  if (sessionUser) {
    const profile = await getProfileByAuthUserId(sessionUser.id).catch(() => null);
    if (!profile || !isLoadOrScaleUsername(profile.username)) {
      return { status: 401, error: "Profile required." };
    }
    return { ok: true, profileId: profile.id, mode: "session" };
  }

  const expected = loadtestSecretFromEnv(env);
  const received = bearerToken(request);
  if (!expected || !received || !timingSafeEqualString(received, expected)) {
    return { status: 401, error: "Unauthorized." };
  }

  const writerIndex = parseLoadtestWriterHeader(
    request.headers.get(LOADTEST_WRITER_HEADER),
  );
  if (writerIndex == null) {
    return { status: 400, error: "Writer required." };
  }
  const account = loadtestAccount(writerIndex);
  const profile = await getProfileByUsername(account.username).catch(() => null);
  if (!profile) {
    return { status: 401, error: "Profile required." };
  }
  return { ok: true, profileId: profile.id, mode: "secret" };
}

export function loadtestBodyTooLarge(contentLength: string | null): boolean {
  const n = Number(contentLength);
  if (!Number.isFinite(n) || n < 0) return false;
  return n > MAX_BODY_BYTES;
}

export { MAX_BODY_BYTES as LOADTEST_MAX_BODY_BYTES };
