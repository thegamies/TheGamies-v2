import type { Metadata } from "next";
import Link from "next/link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { AdminWebhooksClient } from "./AdminWebhooksClient";

export const metadata: Metadata = {
  title: "Admin Webhooks",
  robots: { index: false, follow: false },
};

export default async function AdminWebhooksPage() {
  await requireSiteAdminPage();

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Catalog webhooks
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Hold IGDB catalog updates, then apply them while delivery is open.
      </p>
      <div className="mt-10">
        <AdminWebhooksClient />
      </div>
    </main>
  );
}
