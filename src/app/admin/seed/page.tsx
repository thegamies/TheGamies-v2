import type { Metadata } from "next";
import Link from "next/link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { countStandingsSeeds } from "@/lib/live-aggregate/seed-standings";
import { AdminSeedClient } from "./AdminSeedClient";

/** Seed + year rebuild can exceed the default serverless budget. */
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Admin Standings Seed",
  robots: { index: false, follow: false },
};

export default async function AdminSeedPage() {
  await requireSiteAdminPage();
  const year = new Date().getUTCFullYear();
  let initialStats: {
    profiles: number;
    lists: number;
    maxIndex: number;
  } | null = null;
  try {
    initialStats = await countStandingsSeeds();
  } catch {
    initialStats = null;
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Standings seed
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Generate synthetic voters and Game of the Year lists to exercise live
        standings locally or on staging. Category votes are optional.
      </p>
      <div className="mt-10">
        <AdminSeedClient initialYear={year} initialStats={initialStats} />
      </div>
    </main>
  );
}
