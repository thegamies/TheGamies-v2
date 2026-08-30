"use client";

import { authClient } from "./client";

export async function sendVerificationLink(input: {
  email: string;
  callbackURL: string;
}): Promise<{ error?: { message?: string } | null }> {
  const { error } = await authClient.sendVerificationEmail({
    email: input.email,
    callbackURL: input.callbackURL,
  });
  return { error: error ?? null };
}
