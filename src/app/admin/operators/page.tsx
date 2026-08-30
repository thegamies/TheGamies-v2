import type { Metadata } from "next";
import Link from "next/link";
import {
  getRequestSiteAdminProfile,
  requireSiteAdminPage,
} from "@/lib/admin-auth";
import { listSiteOperators } from "@/lib/site-ops/service";
import { SiteOperatorsForm } from "./SiteOperatorsForm";

export const metadata: Metadata = {
  title: "Site operators",
  robots: { index: false, follow: false },
};

export default async function AdminOperatorsPage() {
  await requireSiteAdminPage();
  const viewer = await getRequestSiteAdminProfile();
  const operators = await listSiteOperators();

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Site operators
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        People who can use site operations.
      </p>
      <div className="mt-10">
        <SiteOperatorsForm
          operators={operators}
          viewerProfileId={viewer?.id ?? ""}
        />
      </div>
    </main>
  );
}
