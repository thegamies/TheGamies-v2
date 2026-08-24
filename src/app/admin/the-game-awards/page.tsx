import type { Metadata } from "next";
import Link from "next/link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { listTgaYears } from "@/lib/tga-pickem/service";
import { tgaStatusLabel } from "@/lib/tga-pickem/status";
import { AdminTgaIndexClient } from "./AdminTgaIndexClient";

export const metadata: Metadata = {
  title: "Video Game Awards Pick’em",
  robots: { index: false, follow: false },
};

export default async function AdminTgaIndexPage() {
  await requireSiteAdminPage();
  let years: Awaited<ReturnType<typeof listTgaYears>> = [];
  try {
    years = await listTgaYears();
  } catch {
    years = [];
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Admin
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Video Game Awards Pick’em
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Set up a year, load categories, and call winners during the show.{" "}
        <Link href="/admin/the-game-awards/seed" className="font-semibold text-accent">
          Seed empty seed accounts
        </Link>
      </p>
      <div className="mt-10">
        <AdminTgaIndexClient
          years={years.map((year) => ({
            year: year.year,
            status: tgaStatusLabel(year.status),
            enabled: year.enabled,
            promoted: year.promoted,
            complete: year.complete,
          }))}
        />
      </div>
    </main>
  );
}
