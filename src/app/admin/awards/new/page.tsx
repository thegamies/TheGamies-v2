import type { Metadata } from "next";
import Link from "@/lib/next-link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { nextAwardSortOrder } from "@/lib/live-aggregate/award-category-admin";
import { DEFAULT_AWARD_CATEGORY_GROUP } from "@/lib/live-aggregate/award-category-defs";
import { AdminAwardForm } from "../AdminAwardForm";

export const metadata: Metadata = {
  title: "Add site award",
  robots: { index: false, follow: false },
};

export default async function AdminNewAwardPage() {
  await requireSiteAdminPage();
  const sortOrder = await nextAwardSortOrder();

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
        {" / "}
        <Link href="/admin/awards" className="hover:text-ink">
          Site awards
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Add award
      </h1>
      <AdminAwardForm
        mode="create"
        initial={{
          id: "",
          label: "",
          description: "",
          sortOrder,
          categoryGroup: DEFAULT_AWARD_CATEGORY_GROUP,
          eligibility: "current_year",
          allowEditions: false,
          allowDlcAddon: false,
          currentOrPreviousYear: false,
          active: true,
        }}
      />
    </main>
  );
}
