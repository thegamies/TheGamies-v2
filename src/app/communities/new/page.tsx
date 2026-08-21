import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { CreateCommunityForm } from "./CreateCommunityForm";

export const metadata: Metadata = {
  title: "Start a community",
  robots: { index: false, follow: false },
};

export default async function NewCommunityPage() {
  const user = await getRequestSessionUser();
  if (!user?.id) {
    redirect("/auth/sign-in?next=/communities/new");
  }
  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile) {
    redirect("/account");
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/communities" className="hover:text-ink">
          Communities
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Start a community
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        A private home for your crew. People join with an invite.
      </p>
      <CreateCommunityForm />
    </main>
  );
}
