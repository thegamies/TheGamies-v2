import type { Metadata } from "next";
import Link from "next/link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { getYearStats } from "@/lib/live-aggregate/service";
import { getSiteSettings } from "@/lib/site-settings/service";
import { DEFAULT_STANDING_FILL_MIN_VISIBLE } from "@/lib/standings/standing-fill";
import type { SharedRankMode } from "@/lib/standings/shared-rank";
import { AdminRankingsClient } from "./AdminRankingsClient";

export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Admin Rankings",
  robots: { index: false, follow: false },
};

export default async function AdminRankingsPage() {
  await requireSiteAdminPage();
  const year = new Date().getUTCFullYear();
  let initialStats = null;
  let initialLandingYears: number[] | null = null;
  let initialRankMode: SharedRankMode = "competition";
  let initialPublicBoardMinLists = 5;
  let initialPublicBoardMinCategoryVotes = 5;
  let initialStandingFillMinVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE;
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
    initialPublicBoardMinLists = settings.publicBoardMinLists;
    initialPublicBoardMinCategoryVotes = settings.publicBoardMinCategoryVotes;
    initialStandingFillMinVisible = settings.standingFillMinVisible;
  } catch {
    initialLandingYears = null;
    initialRankMode = "competition";
    initialPublicBoardMinLists = 5;
    initialPublicBoardMinCategoryVotes = 5;
    initialStandingFillMinVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE;
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
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
        the public boards, how many lists a year needs before Game of the
        Year is public, how many votes an award needs before that category
        board is public, or how many covers sit in view on the homepage
        row.
      </p>
      <div className="mt-10">
        <AdminRankingsClient
          initialYear={year}
          initialStats={initialStats}
          initialLandingYears={initialLandingYears}
          initialRankMode={initialRankMode}
          initialPublicBoardMinLists={initialPublicBoardMinLists}
          initialPublicBoardMinCategoryVotes={
            initialPublicBoardMinCategoryVotes
          }
          initialStandingFillMinVisible={initialStandingFillMinVisible}
        />
      </div>
    </main>
  );
}
