import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { ensureProfileForAuthUser } from "@/lib/profile/service";
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

  let profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile) {
    const base =
      user.name?.trim() ||
      user.email?.split("@")[0] ||
      `player${user.id.slice(0, 6)}`;
    const username = base
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 24)
      .padEnd(3, "0");
    const ensured = await ensureProfileForAuthUser({
      authUserId: user.id,
      username,
      displayName: user.name?.trim() || username,
    });
    if ("error" in ensured) {
      profile = null;
    } else {
      profile = ensured.profile;
    }
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Your profile
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        This is how you appear across The Gamies.
      </p>

      {!profile ? (
        <p className="mt-8 text-accent">
          Could not load your profile. Try signing out and back in.
        </p>
      ) : (
        <>
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
        </>
      )}
    </main>
  );
}
