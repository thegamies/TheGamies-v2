import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRequestSessionUser } from "@/lib/auth/session";
import { buildSignInHref, resolvePostAuthRedirect } from "@/lib/auth/return-to";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email confirmed",
  robots: { index: false, follow: false },
};

export default async function EmailConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = resolvePostAuthRedirect(params.next);
  const user = await getRequestSessionUser();
  if (user?.id) {
    redirect(next);
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        Email confirmed
      </h1>
      <p className="mt-3 text-muted">Sign in to continue.</p>
      <p className="mt-10">
        <Link
          href={buildSignInHref({ next })}
          className="text-ink underline"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
