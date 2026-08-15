import type { Metadata } from "next";
import Link from "next/link";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getYearStats } from "@/lib/live-aggregate/service";
import { getSiteSettings } from "@/lib/site-settings/service";
import type { SharedRankMode } from "@/lib/standings/shared-rank";
import { AdminRankingsClient } from "./AdminRankingsClient";

export const metadata: Metadata = {
  title: "Admin Rankings",
  robots: { index: false, follow: false },
};

export default async function AdminRankingsPage() {
  const authorized = await isAdminAuthorized();
  const year = new Date().getUTCFullYear();
  let initialStats = null;
  let initialLandingYears: number[] | null = null;
  let initialRankMode: SharedRankMode = "competition";
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
    try {
      const settings = await getSiteSettings();
      initialLandingYears = settings.landingStandingsYears;
      initialRankMode = settings.rankMode;
    } catch {
      initialLandingYears = null;
      initialRankMode = "competition";
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
          Reveal detailed scores for a year, refresh dirty rollups, rebuild the
          year cache, choose homepage years, or set how ties are numbered on
          the public boards.
        </p>
        <div className="mt-10">
          <AdminRankingsClient
            authorized={authorized}
            initialYear={year}
            initialStats={initialStats}
            initialLandingYears={initialLandingYears}
            initialRankMode={initialRankMode}
          />
        </div>
      </main>
    </>
  );
}
