import { markAuthEmailVerified } from "@/lib/auth/mark-email-verified";
import { removeSelfHostedAuthUser } from "@/lib/auth/remove-self-hosted-auth-user";
import type { NeonSql } from "@/lib/auth/neon-sql";
import { applySetCookieHeaders } from "@/lib/request-cost/load-session";

export type AuthAppTarget = {
  appUrl: string;
};

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result;
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? rows : [];
}

export async function authPost(
  target: AuthAppTarget,
  endpoint: string,
  body: unknown,
  cookie?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: target.appUrl,
    accept: "application/json",
  };
  if (cookie) headers.cookie = cookie;
  return fetch(`${target.appUrl}/api/auth/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export async function authGetSession(
  target: AuthAppTarget,
  cookie: string,
): Promise<Response> {
  return fetch(`${target.appUrl}/api/auth/get-session`, {
    method: "GET",
    headers: {
      accept: "application/json",
      cookie,
      origin: target.appUrl,
    },
    cache: "no-store",
  });
}

export function setCookieHeadersFromResponse(res: Response): string[] {
  const getSetCookie = (
    res.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  if (typeof getSetCookie === "function") {
    return getSetCookie.call(res.headers).filter(Boolean);
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

/** Merge Set-Cookie from a response into a Cookie request header. */
export function mergeAuthCookies(
  current: string,
  res: Response,
): string {
  const setCookies = setCookieHeadersFromResponse(res);
  if (setCookies.length === 0) return current;
  return applySetCookieHeaders(current, setCookies);
}

export async function findAuthUserIdByEmail(
  query: NeonSql,
  email: string,
): Promise<string | null> {
  const result =
    await query`SELECT id FROM auth_user WHERE lower(email) = lower(${email}) LIMIT 1`;
  const id = rowsOf(result)[0]?.id;
  return typeof id === "string" ? id : null;
}

export async function signInEmailWorks(
  target: AuthAppTarget,
  input: { email: string; password: string },
): Promise<boolean> {
  const res = await authPost(target, "sign-in/email", {
    email: input.email,
    password: input.password,
  });
  return res.ok;
}

/**
 * Ensure a Better Auth email/password user exists, is verified (SQL — no mail),
 * and accepts `password`. Recreates the auth user when the password no longer
 * works. Callers must use undeliverable addresses (`@example.com`) so Worker
 * EMAIL never sends.
 */
export async function ensureVerifiedAuthUser(input: {
  target: AuthAppTarget;
  query: NeonSql;
  email: string;
  password: string;
  name: string;
  log?: (message: string) => void;
}): Promise<string> {
  const { target, query, email, password, name } = input;
  const log = input.log ?? (() => {});

  let authUserId = await findAuthUserIdByEmail(query, email);
  if (!authUserId) {
    const res = await authPost(target, "sign-up/email", {
      email,
      password,
      name,
    });
    if (!res.ok) {
      throw new Error(`sign-up for ${email} failed with HTTP ${res.status}`);
    }
    authUserId = await findAuthUserIdByEmail(query, email);
    log(`created auth user ${email}`);
  }
  if (!authUserId) {
    throw new Error(`auth user missing after sign-up for ${email}`);
  }
  await markAuthEmailVerified({ authUserId, query });

  if (await signInEmailWorks(target, { email, password })) {
    return authUserId;
  }

  log(`sign-in failed for ${email}, recreating auth user`);
  await removeSelfHostedAuthUser(authUserId, { query, email });
  const res = await authPost(target, "sign-up/email", {
    email,
    password,
    name,
  });
  if (!res.ok) {
    throw new Error(`re-sign-up for ${email} failed with HTTP ${res.status}`);
  }
  authUserId = await findAuthUserIdByEmail(query, email);
  if (!authUserId) {
    throw new Error(`auth user missing after recreate for ${email}`);
  }
  await markAuthEmailVerified({ authUserId, query });
  if (!(await signInEmailWorks(target, { email, password }))) {
    throw new Error(`sign-in still failing after recreate for ${email}`);
  }
  return authUserId;
}

/**
 * Sign in and return the Cookie header for later same-origin requests.
 */
export async function signInEmailCookie(
  target: AuthAppTarget,
  input: { email: string; password: string },
): Promise<{ ok: true; cookie: string } | { ok: false; status: number }> {
  const res = await authPost(target, "sign-in/email", {
    email: input.email,
    password: input.password,
  });
  if (!res.ok) return { ok: false, status: res.status };
  const cookie = mergeAuthCookies("", res);
  if (!cookie) return { ok: false, status: res.status };
  return { ok: true, cookie };
}
