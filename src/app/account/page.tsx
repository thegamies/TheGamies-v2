import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPasswordCredential } from "@/lib/auth/has-password-credential";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { AccountDeleteForm } from "./AccountDeleteForm";
import { AccountPasswordForm } from "./AccountPasswordForm";
import { AccountProfileForm } from "./AccountProfileForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await getRequestSessionUser();
  if (!user?.id) {
    redirect("/auth/sign-in?next=/account");
  }

  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile) {
    redirect("/auth/complete-profile?next=/account");
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Your profile
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        This is how you appear across The Gamies.
      </p>

      <p className="mt-4 text-sm text-muted">
        Public page:{" "}
        <Link
          href={`/u/${profile.username}`}
          className="text-ink underline"
        >
          /u/{profile.username}
        </Link>
      </p>
      <AccountProfileForm profile={profile} />
      <AccountPasswordForm />
      <AccountDeleteForm
        hasPassword={await hasPasswordCredential(user.id)}
      />
    </main>
  );
}
