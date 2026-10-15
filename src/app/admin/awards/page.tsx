import type { Metadata } from "next";
import Link from "@/lib/next-link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import {
  AWARD_CATEGORY_ELIGIBILITY_LABEL,
  AWARD_CATEGORY_GROUP_LABEL,
  parseAwardCategoryEligibility,
  parseAwardCategoryGroup,
} from "@/lib/live-aggregate/award-category-defs";
import {
  ADMIN_AWARD_PAGE_SIZE,
  ADMIN_AWARD_SEARCH_LIMIT,
  listAwardCategoriesForAdmin,
} from "@/lib/live-aggregate/award-category-admin";

export const metadata: Metadata = {
  title: "Site awards",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAwardsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSiteAdminPage();
  const params = await searchParams;
  const q = first(params.q)?.trim() ?? "";
  const page = Math.max(1, Math.floor(Number(first(params.page) ?? "1") || 1));
  const { rows, total } = await listAwardCategoriesForAdmin({ q, page });
  const pageSize = q ? ADMIN_AWARD_SEARCH_LIMIT : ADMIN_AWARD_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/admin/awards?${qs}` : "/admin/awards";
  };

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Site awards
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Awards people pick on Game of the Year lists. Add or edit here — lists
        use what is saved, not a code deploy.
      </p>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <form method="get" className="flex min-w-0 flex-1 items-end gap-2">
          <label className="block min-w-0 flex-1">
            <span className="sr-only">Search awards</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name"
              className={fieldInputClass}
            />
          </label>
          <Button type="submit" variant="bordered">
            Search
          </Button>
        </form>
        <Link href="/admin/awards/new">
          <Button type="button">Add award</Button>
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-10 text-muted">
          {q ? "No awards match that search." : "No site awards yet."}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {rows.map((row) => (
            <li key={row.id} className="flex items-baseline justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-display text-xl tracking-wide text-ink">
                  {row.label}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {AWARD_CATEGORY_GROUP_LABEL[parseAwardCategoryGroup(row.categoryGroup)]}
                  {" · "}
                  {
                    AWARD_CATEGORY_ELIGIBILITY_LABEL[
                      parseAwardCategoryEligibility(row.eligibility)
                    ]
                  }
                  {row.active ? "" : " · Hidden"}
                </p>
              </div>
              <Link
                href={`/admin/awards/${row.id}`}
                className="shrink-0 text-sm text-muted hover:text-ink"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 ? (
        <nav className="mt-8 flex gap-4 text-sm">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className="text-muted hover:text-ink">
              Previous
            </Link>
          ) : null}
          <span className="text-muted">
            {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={hrefFor(page + 1)} className="text-muted hover:text-ink">
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
