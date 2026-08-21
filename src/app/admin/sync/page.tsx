import type { Metadata } from "next";
import Link from "next/link";
import { createDb } from "@thegamies/db";
import {
  getBackfillResumeInfo,
  listRecentSyncRuns,
} from "@thegamies/igdb";
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
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          <Link href="/admin" className="hover:text-ink">
            Ops
          </Link>
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
          Catalog sync
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Import and enrich the game catalog from IGDB.
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
