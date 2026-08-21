import type { Metadata } from "next";
import Link from "next/link";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { countCommunitySeeds } from "@/lib/communities/seed-community";
import { AdminCommunitiesClient } from "./AdminCommunitiesClient";

/** Publish / rebuild freeze can exceed the default serverless budget. */
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Admin Community Seed",
  robots: { index: false, follow: false },
};

export default async function AdminCommunitiesPage() {
  const authorized = await isAdminAuthorized();
  const year = new Date().getUTCFullYear();
  let initialStats: {
    profiles: number;
    maxIndex: number;
    membersInCommunity: number;
    ballotsInEdition: number;
  } | null = null;
  if (authorized) {
    try {
      initialStats = await countCommunitySeeds();
    } catch {
      initialStats = null;
    }
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Community seed
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Join synthetic members to a community, designate Hosts, and write
        edition ballots for local or staging QA.
      </p>
      <div className="mt-10">
        <AdminCommunitiesClient
          authorized={authorized}
          initialYear={year}
          initialStats={initialStats}
        />
      </div>
    </main>
  );
}
