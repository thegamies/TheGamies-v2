"use client";

import { authClient } from "./client";

export async function verifyEmailOtp(input: {
  email: string;
  otp: string;
}): Promise<{ error?: { message?: string } | null }> {
  const { error } = await authClient.emailOtp.verifyEmail({
    email: input.email,
    otp: input.otp,
  });
  return { error: error ?? null };
}

export async function resendEmailVerificationOtp(input: {
  email: string;
}): Promise<{ error?: { message?: string } | null }> {
  const { error } = await authClient.emailOtp.sendVerificationOtp({
    email: input.email,
    type: "email-verification",
  });
  return { error: error ?? null };
}

