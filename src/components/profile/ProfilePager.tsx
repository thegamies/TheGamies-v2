import Link from "next/link";

export function ProfilePager({
  from,
  to,
  total,
  page,
  totalPages,
  prevHref,
  nextHref,
  label,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
  label: string;
}) {
  if (total <= to && page === 1) return null;

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm"
      aria-label={label}
    >
      <p className="text-muted">
        {from}–{to} of {total} · page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
          >
            Previous
          </Link>
        ) : null}
        {nextHref ? (
          <Link
            href={nextHref}
            className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
