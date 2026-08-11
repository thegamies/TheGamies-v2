"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

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

  redirect("/account");
}
