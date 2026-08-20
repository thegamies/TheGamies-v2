import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmEmailClient } from "./ConfirmEmailClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email confirmed",
  robots: { index: false, follow: false },
};

export default function EmailConfirmedPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        Email confirmed
      </h1>
      <Suspense
        fallback={
          <p className="mt-10 text-sm text-muted">Confirming your email…</p>
        }
      >
        <ConfirmEmailClient />
      </Suspense>
    </main>
  );
}
