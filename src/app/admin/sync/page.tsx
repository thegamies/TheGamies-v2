import type { Metadata } from "next";
import { createDb } from "@thegamies/db";
import {
  getBackfillResumeInfo,
  listRecentSyncRuns,
} from "@thegamies/igdb";
import { SiteHeader } from "@/components/SiteHeader";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { AdminSyncClient } from "./AdminSyncClient";

export const metadata: Metadata = {
  title: "Admin Sync",
  robots: { index: false, follow: false },
};

export default async function AdminSyncPage() {
  const authorized = await isAdminAuthorized();
  let initialRuns: Awaited<ReturnType<typeof listRecentSyncRuns>> = [];
  let initialResume: Awaited<ReturnType<typeof getBackfillResumeInfo>> | null =
    null;

      if (authorized) {
    try {
      const db = createDb();
      const year = new Date().getUTCFullYear();
      initialRuns = await listRecentSyncRuns(db, 25);
      initialResume = await getBackfillResumeInfo(db, { year });
    } catch {
      initialRuns = [];
      initialResume = null;
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Ops</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
          Catalog sync
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Core games backfill and lookup enrich. Same pipeline as{" "}
          <code className="text-ink">pnpm sync:igdb</code>.
        </p>
        <div className="mt-10">
          <AdminSyncClient
            authorized={authorized}
            initialRuns={initialRuns}
            initialResume={initialResume}
          />
        </div>
      </main>
    </>
  );
}
