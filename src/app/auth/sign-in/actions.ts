"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { resolvePostAuthRedirect } from "@/lib/auth/return-to";
import { isUnverifiedEmailError } from "@/lib/auth/email-verification-copy";

export type SignInState =
  | { error: string; unverifiedEmail?: string }
  | null;

export async function signInWithEmail(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = resolvePostAuthRedirect(
    formData.get("next"),
    formData.get("intent"),
  );

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const { error } = await auth.signIn.email({
    email,
    password,
  });

  if (error) {
    const message = error.message || "Could not sign in.";
    if (isUnverifiedEmailError(error)) {
      return { error: message, unverifiedEmail: email };
    }
    return { error: message };
  }

  redirect(next);
}
