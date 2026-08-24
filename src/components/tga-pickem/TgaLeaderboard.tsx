import Link from "next/link";
import type { TgaLeaderboardRow } from "@/lib/tga-pickem/scores";

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
      <ol className="divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <li
            key={row.profileId}
            className="flex flex-wrap items-baseline justify-between gap-3 py-3"
          >
            <p className="text-ink">
              <span className="font-display text-2xl tracking-wide">
                {row.place}
              </span>{" "}
              <Link
                href={
                  sheetHref
                    ? sheetHref(row.username)
                    : `/u/${row.username}`
                }
                className="font-semibold hover:text-accent"
              >
                {row.displayName}
              </Link>
            </p>
            <p className="text-sm text-muted">
              {row.points} {row.points === 1 ? "point" : "points"}
              {row.wpDelta != null ? ` · ${row.wpDelta} WP off` : ""}
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
