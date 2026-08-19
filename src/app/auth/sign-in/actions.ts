"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { isUnverifiedEmailError } from "@/lib/auth/email-verification-copy";
import { parseListAuthIntent } from "@/lib/lists/auth-intent";
import {
  buildVerifyEmailHref,
  resolvePostAuthRedirect,
} from "@/lib/auth/return-to";

export type SignInState = { error: string } | null;

export async function signInWithEmail(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const intent = parseListAuthIntent(formData.get("intent"));
  const next = resolvePostAuthRedirect(formData.get("next"), intent);

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const { error } = await auth.signIn.email({
    email,
    password,
  });

  if (error) {
    if (isUnverifiedEmailError(error)) {
      redirect(
        buildVerifyEmailHref({
          email,
          next: String(formData.get("next") ?? "") || null,
          intent,
        }),
      );
    }
    return { error: error.message || "Could not sign in." };
  }

  redirect(next);
}
