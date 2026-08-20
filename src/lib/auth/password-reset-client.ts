"use client";

import { authClient } from "./client";

export async function requestPasswordResetEmail(input: {
  email: string;
  redirectTo: string;
}): Promise<{ error?: { message?: string } | null }> {
  const { error } = await authClient.requestPasswordReset({
    email: input.email,
    redirectTo: input.redirectTo,
  });
  return { error: error ?? null };
}

export async function completePasswordReset(input: {
  newPassword: string;
  token: string;
}): Promise<{ error?: { message?: string } | null }> {
  const { error } = await authClient.resetPassword({
    newPassword: input.newPassword,
    token: input.token,
  });
  return { error: error ?? null };
}
