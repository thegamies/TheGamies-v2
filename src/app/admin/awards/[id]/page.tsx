import type { Metadata } from "next";
import Link from "@/lib/next-link";
import { notFound } from "next/navigation";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { getAwardCategoryById } from "@/lib/live-aggregate/award-category-admin";
import { AdminAwardForm } from "../AdminAwardForm";

export const metadata: Metadata = {
  title: "Edit site award",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function AdminEditAwardPage({
  params,
}: {
  params: Params;
}) {
  await requireSiteAdminPage();
  const { id } = await params;
  const row = await getAwardCategoryById(decodeURIComponent(id));
  if (!row) notFound();

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
        {row.label}
      </h1>
      <AdminAwardForm mode="edit" initial={row} />
    </main>
  );
}
