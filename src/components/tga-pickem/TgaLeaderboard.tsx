import Link from "@/lib/next-link";
import { PersonIdentity } from "@/components/profile/PersonIdentity";
import type { TgaLeaderboardRow } from "@/lib/tga-pickem/scores";

const rowGridClass =
  "grid grid-cols-[minmax(0,1fr)_3.25rem_minmax(4.75rem,6.5rem)] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_9rem] sm:gap-x-4";

export function TgaLeaderboard({
  rows,
  page,
  totalPages,
  pageHref,
  sheetHref,
  emptyCopy,
}: {
  rows: TgaLeaderboardRow[];
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
  sheetHref?: (username: string) => string;
  emptyCopy?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-muted">
        {emptyCopy ?? "Standings appear as awards are called."}
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div
        className={`${rowGridClass} sticky top-0 z-10 border-y border-line bg-paper py-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted`}
        role="row"
      >
        <span role="columnheader">Name</span>
        <span className="text-right" role="columnheader">
          Points
        </span>
        <span className="text-right leading-tight" role="columnheader">
          World Premier Off
        </span>
      </div>
      <ol className="divide-y divide-line border-b border-line">
        {rows.map((row) => (
          <li key={row.profileId} className={`${rowGridClass} py-3`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-7 shrink-0 font-display text-2xl tracking-wide text-ink tabular-nums">
                {row.place}
              </span>
              <PersonIdentity
                displayName={row.displayName}
                username={row.username}
                avatarUrl={row.avatarUrl}
                href={
                  sheetHref
                    ? sheetHref(row.username)
                    : `/u/${row.username}`
                }
                nameClassName="font-semibold text-ink"
                subtitle={null}
              />
            </div>
            <p className="text-right text-sm tabular-nums text-ink">
              {row.points}
            </p>
            <p className="text-right text-sm tabular-nums text-muted">
              {row.wpDelta != null ? row.wpDelta : "—"}
            </p>
          </li>
        ))}
      </ol>
      {totalPages > 1 ? (
        <p className="mt-4 flex gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-accent">
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="text-accent">
              Next
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
