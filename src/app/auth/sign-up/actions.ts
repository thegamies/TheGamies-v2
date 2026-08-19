"use server";

import { redirect } from "next/navigation";
import { requestEmailVerificationOtp } from "@/lib/auth/request-email-verification";
import { auth } from "@/lib/auth/server";
import { resolvePostAuthRedirect } from "@/lib/auth/return-to";
import { ensureProfileForAuthUser } from "@/lib/profile/service";
import { validatePassword } from "@/lib/auth/password";

export type SignUpState =
  | { error: string }
  | { needsVerification: true; email: string; codeRequested: boolean }
  | null;

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
    const codeRequested = await requestEmailVerificationOtp(email);
    return { needsVerification: true, email, codeRequested };
  }

  redirect(next);
}
