import Link from "next/link";
import type { EditionStatus } from "@/lib/communities/edition-status";

export type EditionHostPreviewSubmitter = {
  profileId: string;
  displayName: string;
  username: string;
  isVoice: boolean;
  itemCount: number;
};

export function EditionHostPreview({
  status,
  submitters,
  page = 1,
  pageSize = 50,
  total = submitters.length,
  totalPages = 1,
  pageHref,
}: {
  status: EditionStatus;
  submitters: EditionHostPreviewSubmitter[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  /** Build href for host-preview page `n` (1-based). */
  pageHref?: (page: number) => string;
}) {
  if (status === "published") return null;

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, total);

  return (
    <div className="mt-8">
      <h4 className="font-display text-xl tracking-wide text-ink">
        Host preview
      </h4>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Submitted ballots stay hidden until results publish.
      </p>
      {total === 0 ? (
        <p className="mt-4 text-sm text-muted">No ballots submitted yet.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            {total} submitted ballot{total === 1 ? "" : "s"}.
          </p>
          <ul className="mt-4 max-h-64 divide-y divide-line overflow-auto border-y border-line text-sm">
            {submitters.map((submitter) => (
              <li
                key={submitter.profileId}
                className="flex justify-between gap-3 py-3"
              >
                <span>
                  <Link
                    href={`/u/${submitter.username}`}
                    className="text-ink hover:text-accent"
                  >
                    {submitter.displayName}
                  </Link>
                  {submitter.isVoice ? (
                    <span className="text-muted"> · Host</span>
                  ) : null}
                </span>
                <span className="text-muted">
                  {submitter.itemCount}{" "}
                  {submitter.itemCount === 1 ? "game" : "games"}
                </span>
              </li>
            ))}
          </ul>
          {totalPages > 1 && pageHref ? (
            <nav
              className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
              aria-label="Host preview pages"
            >
              <p className="text-muted">
                {rangeFrom}–{rangeTo} of {total} · page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="border border-line px-3 py-1.5 text-muted/50">
                    Previous
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={pageHref(page + 1)}
                    className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="border border-line px-3 py-1.5 text-muted/50">
                    Next
                  </span>
                )}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
