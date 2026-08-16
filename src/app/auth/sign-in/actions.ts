"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { resolvePostAuthRedirect } from "@/lib/auth/return-to";

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
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
    return { error: error.message || "Could not sign in." };
  }

  redirect(next);
}
