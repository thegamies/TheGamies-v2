import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";
import { SIGN_IN_CLOSE_FAILED } from "./account-delete-copy";
import { deleteNeonAuthUserViaApi } from "./neon-auth-directory";
import { removeNeonAuthDirectoryUser } from "./remove-neon-auth-user";

type DeleteUserResult = {
  error?: { message?: string } | null;
};

type AuthWithDeleteUser = {
  deleteUser?: (input?: { password?: string }) => Promise<DeleteUserResult>;
};

function passwordError(message: string): boolean {
  return /password|credential/i.test(message);
}

function authSignInUrl(): URL | null {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  if (!baseUrl) return null;
  return new URL(
    "sign-in/email",
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
}

async function requestOrigin(): Promise<string> {
  const headerStore = await headers();
  return (
    headerStore.get("origin") ||
    headerStore.get("referer")?.split("/").slice(0, 3).join("/") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ""
  );
}

/**
 * Check email + password without going through the SDK sign-in helper.
 * `auth.signIn.email` writes a new session cookie on the response but later
 * server calls still send the original Cookie header, so deleteUser would 401.
 */
export async function verifyAccountPassword(input: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { error: string }> {
  const url = authSignInUrl();
  if (!url) return { error: "Could not verify this account." };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: await requestOrigin(),
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string } | string | null;
    } | null;
    if (!response.ok || payload?.error) {
      return { error: "That password is incorrect." };
    }
    return { ok: true };
  } catch {
    return { error: "That password is incorrect." };
  }
}

/**
 * Close the Neon Auth user so the email can be reused.
 *
 * Neon documents three ways:
 * 1. SDK `auth.deleteUser()` (often a no-op while deleteUser is disabled)
 * 2. Console / API DELETE …/auth/users/{id} (what Auth → Users lists)
 * 3. SQL against `neon_auth` (database is the source of truth)
 *
 * We try all three and only succeed when the directory row is gone.
 */
export async function deleteAuthenticatedUser(input: {
  password: string;
  authUserId: string;
  email?: string;
}): Promise<{ ok: true } | { error: string }> {
  const auth = getAuth() as AuthWithDeleteUser;

  try {
    if (typeof auth.deleteUser === "function") {
      const { error } = await auth.deleteUser({ password: input.password });
      if (error && passwordError(error.message ?? "")) {
        return { error: "That password is incorrect." };
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (passwordError(message)) {
      return { error: "That password is incorrect." };
    }
  }

  const viaApi = await deleteNeonAuthUserViaApi(input.authUserId).catch(
    () => false,
  );
  const viaSql = await removeNeonAuthDirectoryUser(input.authUserId, {
    email: input.email,
  }).catch(() => false);

  if (viaApi || viaSql) return { ok: true };
  return { error: SIGN_IN_CLOSE_FAILED };
}
