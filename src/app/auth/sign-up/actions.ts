"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { markNeonAuthEmailVerified } from "@/lib/auth/mark-email-verified";
import {
  buildEmailConfirmedCallbackUrl,
  resolvePostAuthRedirect,
} from "@/lib/auth/return-to";
import {
  shouldPromptConfirmEmail,
  signUpHasSession,
} from "@/lib/auth/confirm-email-prompt";
import { skipEmailVerification } from "@/lib/auth/skip-email-verification";
import { ensureProfileForAuthUser } from "@/lib/profile/service";
import { validatePassword } from "@/lib/auth/password";

async function currentAuthSessionExists(): Promise<boolean> {
  try {
    const { data: session } = await auth.getSession();
    return Boolean(session?.user?.id);
  } catch {
    return false;
  }
}

export type SignUpState =
  | { error: string }
  | { needsVerification: true; email: string }
  | null;

async function requestOrigin(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");
  const proto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host =
    headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerStore.get("host")?.trim();
  if (proto && host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
}

export async function signUpWithEmail(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const next = resolvePostAuthRedirect(
    formData.get("next"),
    formData.get("intent"),
  );
  const callbackURL =
    buildEmailConfirmedCallbackUrl(await requestOrigin(), next) ?? undefined;

  if (!email || !password || !name || !username) {
    return { error: "Fill in all fields." };
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) {
    return { error: passwordCheck.message };
  }

  const { data, error } = await auth.signUp.email({
    email,
    password,
    name,
    callbackURL,
  });

  if (error) {
    return { error: error.message || "Could not create account." };
  }

  const userId = data?.user?.id;
  if (!userId) {
    return { error: "Account created, but session is missing. Try signing in." };
  }

  const ensured = await ensureProfileForAuthUser({
    authUserId: userId,
    username,
    displayName: name,
  });

  if ("error" in ensured) {
    return { error: ensured.error };
  }

  if (data?.user?.emailVerified === false) {
    const hasSession =
      signUpHasSession(data) || (await currentAuthSessionExists());
    if (
      !shouldPromptConfirmEmail({ emailVerified: false, hasSession })
    ) {
      redirect(next);
    }
    if (skipEmailVerification()) {
      const marked = await markNeonAuthEmailVerified({
        authUserId: userId,
        email,
      }).catch(() => false);
      if (marked) {
        redirect(next);
      }
    }
    return { needsVerification: true, email };
  }

  redirect(next);
}
