import type { Metadata } from "next";
import Link from "next/link";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";
import { countTgaSheetSeeds } from "@/lib/tga-pickem/seed-sheets";
import { listTgaYears } from "@/lib/tga-pickem/service";
import { AdminTgaSeedClient } from "./AdminTgaSeedClient";

export const maxDuration = 300;

export const metadata: Metadata = {
  title: `${TGA_PUBLIC_LABEL} seed`,
  robots: { index: false, follow: false },
};

export default async function AdminTgaSeedPage() {
  const authorized = await isAdminAuthorized();
  let years: number[] = [];
  let initialYear = new Date().getUTCFullYear();
  let initialStats: {
    siteSheets: number;
    seedVoterSheets: number;
    seedVotersWithoutSheet: number;
  } | null = null;
  if (authorized) {
    try {
      const rows = await listTgaYears();
      years = rows.map((row) => row.year);
      if (years.includes(initialYear) === false && years[0] != null) {
        initialYear = years[0];
      }
      if (years.length > 0) {
        initialStats = await countTgaSheetSeeds(initialYear);
      }
    } catch {
      years = [];
    }
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin/the-game-awards" className="hover:text-ink">
          {TGA_PUBLIC_LABEL}
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Seed sheets
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Fill site pick sheets for standings and community seed accounts that do
        not have an entry yet. Use the community slug below to fill that
        community’s pick’em the same way. Existing sheets are left alone.
      </p>
      <div className="mt-10">
        <AdminTgaSeedClient
          authorized={authorized}
          years={years}
          initialYear={initialYear}
          initialStats={initialStats}
        />
      </div>
    </main>
  );
}
