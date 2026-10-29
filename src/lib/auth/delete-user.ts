import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";
import { SIGN_IN_CLOSE_FAILED } from "./account-delete-copy";
import { removeSelfHostedAuthUser } from "./remove-self-hosted-auth-user";

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
  const base =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!base) return null;
  return new URL(
    "/api/auth/sign-in/email",
    base.endsWith("/") ? base : `${base}/`,
  );
}

async function requestOrigin(): Promise<string> {
  const headerStore = await headers();
  return (
    headerStore.get("origin") ||
    headerStore.get("referer")?.split("/").slice(0, 3).join("/") ||
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ""
  );
}

/**
 * Check email + password without going through the SDK sign-in helper.
 * `signIn.email` would rotate the session cookie; later server calls still
 * send the original Cookie header, so deleteUser would 401.
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
 * Close the Auth user so the email can be reused.
 * Tries Better Auth `deleteUser`, then SQL against `auth_*`.
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

  const viaSql = await removeSelfHostedAuthUser(input.authUserId, {
    email: input.email,
  }).catch(() => false);

  if (viaSql) return { ok: true };
  return { error: SIGN_IN_CLOSE_FAILED };
}
