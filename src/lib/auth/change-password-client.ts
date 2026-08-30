"use client";

import { authClient } from "./client";

function passwordCredentialError(message: string): boolean {
  return /password|credential|invalid/i.test(message);
}

/** Change password via the Auth proxy so a replacement session cookie can be set. */
export async function changeSignedInPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { error: string }> {
  const { error } = await authClient.changePassword({
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    revokeOtherSessions: true,
  });
  if (error) {
    if (passwordCredentialError(error.message ?? "")) {
      return { error: "Current password is incorrect." };
    }
    return { error: "Could not update password." };
  }
  return { ok: true };
}
