"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { resolvePostAuthRedirect } from "@/lib/auth/return-to";
import { ensureProfileForAuthUser } from "@/lib/profile/service";
import { validatePassword } from "@/lib/auth/password";

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
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

  redirect(next);
}
