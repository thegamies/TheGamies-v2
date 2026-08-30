import type { Metadata } from "next";
import Link from "next/link";
import { createDb } from "@thegamies/db";
import {
  getBackfillResumeInfo,
  getWalkResume,
  listRecentSyncRuns,
} from "@thegamies/igdb";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { AdminSyncClient } from "./AdminSyncClient";

export const metadata: Metadata = {
  title: "Admin Sync",
  robots: { index: false, follow: false },
};

export default async function AdminSyncPage() {
  await requireSiteAdminPage();
  let initialRuns: Awaited<ReturnType<typeof listRecentSyncRuns>> = [];
  let initialResume: Awaited<ReturnType<typeof getBackfillResumeInfo>> | null =
    null;
  let initialCatalogResume: Awaited<ReturnType<typeof getWalkResume>> | null =
    null;
  let initialUpdatedResume: Awaited<ReturnType<typeof getWalkResume>> | null =
    null;

  try {
    const db = createDb();
    const year = new Date().getUTCFullYear();
    initialRuns = await listRecentSyncRuns(db, 40);
    initialResume = await getBackfillResumeInfo(db, { year });
    initialCatalogResume = await getWalkResume(db, "catalog", "all");
    initialUpdatedResume = await getWalkResume(db, "updated", "all");
  } catch {
    initialRuns = [];
    initialResume = null;
    initialCatalogResume = null;
    initialUpdatedResume = null;
  }

  return (
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
          initialRuns={initialRuns}
          initialResume={initialResume}
          initialCatalogResume={initialCatalogResume}
          initialUpdatedResume={initialUpdatedResume}
        />
      </div>
    </main>
  );
}
