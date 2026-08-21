import type { Metadata } from "next";
import Link from "next/link";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { AdminWebhooksClient } from "./AdminWebhooksClient";

export const metadata: Metadata = {
  title: "Admin Webhooks",
  robots: { index: false, follow: false },
};

export default async function AdminWebhooksPage() {
  const authorized = await isAdminAuthorized();

  return (
    <>
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          <Link href="/admin" className="hover:text-ink">
            Ops
          </Link>
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
          Catalog webhooks
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Queue IGDB catalog updates and control how often they are applied.
        </p>
        <div className="mt-10">
          <AdminWebhooksClient authorized={authorized} />
        </div>
      </main>
    </>
  );
}
