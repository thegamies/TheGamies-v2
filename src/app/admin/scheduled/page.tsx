import type { Metadata } from "next";
import Link from "next/link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { loadCloudflareCronSettings } from "@/lib/cloudflare/cron-settings-store";
import { AdminScheduledClient } from "./AdminScheduledClient";

export const metadata: Metadata = {
  title: "Admin scheduled jobs",
  robots: { index: false, follow: false },
};

export default async function AdminScheduledPage() {
  await requireSiteAdminPage();
  const loaded = await loadCloudflareCronSettings();

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Scheduled jobs
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Cloudflare background jobs. This does not change Vercel’s schedule.
      </p>
      <div className="mt-10">
        <AdminScheduledClient
          initialPaused={loaded.ok ? loaded.settings.paused : false}
          unavailable={loaded.ok ? null : loaded.error}
        />
      </div>
    </main>
  );
}
