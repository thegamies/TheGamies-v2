"use client";

import { authClient } from "./client";
import {
  clearStaleAuthCookies,
  markVerifiedForLocalDev,
} from "@/app/auth/sign-in/actions";
import {
  isUnverifiedEmailError,
  publicAuthErrorMessage,
} from "./email-verification-copy";
import { parseListAuthIntent } from "@/lib/lists/auth-intent";
import {
  buildVerifyEmailHref,
  resolvePostAuthRedirect,
} from "./return-to";

type SignInEmailClient = {
  signIn: {
    email: (input: { email: string; password: string }) => Promise<{
      error?: { message?: string; code?: string } | null;
    }>;
  };
};

/**
 * Sign in through the Auth proxy (Set-Cookie on this document), after
 * dropping any leftover session cookies from a failed refresh.
 */
export async function signInOnThisOrigin(input: {
  email: string;
  password: string;
  next?: string | null;
  intent?: string | null;
}): Promise<{ error: string } | { href: string }> {
  const email = input.email.trim();
  const password = input.password;
  const intent = parseListAuthIntent(input.intent);
  const next = resolvePostAuthRedirect(input.next, intent);

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  await clearStaleAuthCookies();

  const client = authClient as SignInEmailClient;
  let error: { message?: string; code?: string } | null | undefined;
  try {
    ({ error } = await client.signIn.email({ email, password }));
  } catch (thrown) {
    error =
      thrown && typeof thrown === "object"
        ? (thrown as { message?: string; code?: string })
        : { message: thrown instanceof Error ? thrown.message : String(thrown) };
  }

  if (error && isUnverifiedEmailError(error)) {
    const marked = await markVerifiedForLocalDev(email);
    if (marked) {
      const retry = await client.signIn.email({ email, password });
      if (!retry.error) return { href: next };
    }
    return {
      href: buildVerifyEmailHref({
        email,
        next: input.next || null,
        intent,
      }),
    };
  }

  if (error) {
    return { error: publicAuthErrorMessage(error, "Could not sign in.") };
  }

  return { href: next };
}
