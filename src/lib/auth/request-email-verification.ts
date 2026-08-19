import { getAuth } from "@/lib/auth/server";

/** Neon does not always emit `send.otp` from `signUp.email`; request the code explicitly. */
export async function requestEmailVerificationOtp(email: string): Promise<boolean> {
  const auth = getAuth() as {
    emailOtp?: {
      sendVerificationOtp?: (input: {
        email: string;
        type: "email-verification" | "sign-in" | "forget-password";
      }) => Promise<{ error?: { message?: string } | null }>;
    };
    sendVerificationEmail?: (input: {
      email: string;
    }) => Promise<{ error?: { message?: string } | null }>;
  };

  try {
    if (auth.emailOtp?.sendVerificationOtp) {
      const { error } = await auth.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      return !error;
    }
    if (auth.sendVerificationEmail) {
      const { error } = await auth.sendVerificationEmail({ email });
      return !error;
    }
  } catch {
    return false;
  }
  return false;
}
