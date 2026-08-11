import type { Metadata } from "next";
import Link from "next/link";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getYearStats } from "@/lib/live-aggregate/service";
import { AdminRankingsClient } from "./AdminRankingsClient";

export const metadata: Metadata = {
  title: "Admin Rankings",
  robots: { index: false, follow: false },
};

export default async function AdminRankingsPage() {
  const authorized = await isAdminAuthorized();
  const year = new Date().getUTCFullYear();
  let initialStats = null;
  if (authorized) {
    try {
      const stats = await getYearStats(year);
      initialStats = {
        year: stats.year,
        listCount: stats.listCount,
        detailedStatsRevealed: stats.detailedStatsRevealed,
        contribGeneration: stats.contribGeneration,
        scoresGeneration: stats.scoresGeneration,
        standingsVersion: stats.standingsVersion,
        refreshing: stats.refreshing,
      };
    } catch {
      initialStats = null;
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          <Link href="/admin" className="hover:text-ink">
            Ops
          </Link>
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
          Live standings
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Reveal detailed scores for a year, refresh dirty rollups, or rebuild
          the year cache from contribution facts.
        </p>
        <div className="mt-10">
          <AdminRankingsClient
            authorized={authorized}
            initialYear={year}
            initialStats={initialStats}
          />
        </div>
      </main>
    </>
  );
}
