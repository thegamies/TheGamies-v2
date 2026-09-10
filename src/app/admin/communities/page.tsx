import type { Metadata } from "next";
import Link from "next/link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { countCommunitySeeds } from "@/lib/communities/seed-community";
import { listFeaturedCommunitiesForAdmin } from "@/lib/communities/service";
import { AdminCommunitiesClient } from "./AdminCommunitiesClient";
import { AdminCommunityDirectoryClient } from "./AdminCommunityDirectoryClient";

/** Publish / rebuild freeze can exceed the default serverless budget. */
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Admin Communities",
  robots: { index: false, follow: false },
};

export default async function AdminCommunitiesPage() {
  await requireSiteAdminPage();
  const year = new Date().getUTCFullYear();
  let initialStats: {
    profiles: number;
    maxIndex: number;
    membersInCommunity: number;
    ballotsInEdition: number;
  } | null = null;
  try {
    initialStats = await countCommunitySeeds();
  } catch {
    initialStats = null;
  }
  let initialFeatured: Awaited<
    ReturnType<typeof listFeaturedCommunitiesForAdmin>
  > = [];
  try {
    initialFeatured = await listFeaturedCommunitiesForAdmin();
  } catch {
    initialFeatured = [];
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Communities
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Feature a public demo community, close joins, then seed members and
        ballots for ceremony QA.
      </p>
      <h2 className="mt-12 font-display text-3xl tracking-wide text-ink">
        Directory
      </h2>
      <div className="mt-6">
        <AdminCommunityDirectoryClient initialFeatured={initialFeatured} />
      </div>
      <h2 className="mt-16 font-display text-3xl tracking-wide text-ink">
        Seed
      </h2>
      <p className="mt-3 max-w-2xl text-muted">
        Join synthetic members to a community, designate Hosts, and write
        edition ballots for local or staging QA.
      </p>
      <div className="mt-10">
        <AdminCommunitiesClient
          initialYear={year}
          initialStats={initialStats}
        />
      </div>
    </main>
  );
}
