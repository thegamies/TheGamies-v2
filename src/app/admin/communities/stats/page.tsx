import type { Metadata } from "next";
import Link from "@/lib/next-link";
import { requireSiteAdminPage } from "@/lib/admin-auth";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import {
  ADMIN_COMMUNITY_STATS_PAGE_SIZE,
  ADMIN_COMMUNITY_STATS_SEARCH_LIMIT,
  listCommunityStatsForAdmin,
} from "@/lib/communities/admin-stats";

export const metadata: Metadata = {
  title: "Community stats",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hrefFor(q: string, nextPage: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (nextPage > 1) params.set("page", String(nextPage));
  const qs = params.toString();
  return qs ? `/admin/communities/stats?${qs}` : "/admin/communities/stats";
}

export default async function AdminCommunityStatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSiteAdminPage();
  const params = await searchParams;
  const q = first(params.q)?.trim() ?? "";
  const page = Math.max(1, Math.floor(Number(first(params.page) ?? "1") || 1));
  const { rows, total } = await listCommunityStatsForAdmin({ q, page });
  const pageSize = q ? ADMIN_COMMUNITY_STATS_SEARCH_LIMIT : ADMIN_COMMUNITY_STATS_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/admin" className="hover:text-ink">
          Ops
        </Link>
        {" · "}
        <Link href="/admin/communities" className="hover:text-ink">
          Communities
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Community stats
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Members, Pick’em, edition ballots, and game ranks on those ballots.
        One page at a time.
      </p>
      <form method="get" className="mt-8 flex max-w-xl items-end gap-2">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Search communities</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or slug"
            className={fieldInputClass}
          />
        </label>
        <Button type="submit" variant="bordered">
          Search
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {total === 1 ? "1 community" : `${total} communities`}
      </p>
      {rows.length === 0 ? (
        <p className="mt-10 text-muted">
          {q ? "No communities match that search." : "No communities yet."}
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full border-y border-line text-left">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
                <th className="px-3 py-3 font-extrabold">Community</th>
                <th className="px-3 py-3 text-right font-extrabold">Members</th>
                <th className="px-3 py-3 font-extrabold">Pick’em</th>
                <th className="px-3 py-3 text-right font-extrabold">Sheets</th>
                <th className="px-3 py-3 text-right font-extrabold">Editions</th>
                <th className="px-3 py-3 text-right font-extrabold">Ballots</th>
                <th className="px-3 py-3 text-right font-extrabold">Entries</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="px-3 py-3">
                    <Link
                      href={`/communities/${encodeURIComponent(row.slug)}`}
                      className="font-display text-xl tracking-wide text-ink hover:text-accent"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-muted">{row.slug}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-ink">
                    {row.members}
                  </td>
                  <td className="px-3 py-3 text-sm text-ink">
                    {row.pickemEnabled
                      ? row.pickemYears === 1
                        ? "On"
                        : `On · ${row.pickemYears} years`
                      : "Off"}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-ink">
                    {row.pickemSheets}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-ink">
                    {row.editions}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-ink">
                    {row.ballots}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-ink">
                    {row.editionEntries}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 ? (
        <nav className="mt-8 flex gap-4 text-sm">
          {page > 1 ? (
            <Link href={hrefFor(q, page - 1)} className="text-muted hover:text-ink">
              Previous
            </Link>
          ) : null}
          <span className="text-muted">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={hrefFor(q, page + 1)} className="text-muted hover:text-ink">
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
