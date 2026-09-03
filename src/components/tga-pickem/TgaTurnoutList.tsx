import Link from "next/link";
import { PersonIdentity } from "@/components/profile/PersonIdentity";
import type { TgaEntrantRow } from "@/lib/tga-pickem/sheets";

export function TgaTurnoutList({
  rows,
  total,
  page,
  totalPages,
  pageHref,
  emptyCopy = "No sheets yet.",
  hostsOnly = false,
}: {
  rows: TgaEntrantRow[];
  total: number;
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
  emptyCopy?: string;
  hostsOnly?: boolean;
}) {
  return (
    <div className="mt-6">
      <p className="text-sm text-muted">
        {total} sheet{total === 1 ? "" : "s"}
        {hostsOnly ? " · Hosts" : ""}
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 text-muted">{emptyCopy}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {rows.map((row) => (
            <li key={row.profileId} className="py-3">
              <PersonIdentity
                displayName={row.displayName}
                username={row.username}
                avatarUrl={row.avatarUrl}
                nameClassName="font-semibold text-ink"
              />
            </li>
          ))}
        </ul>
      )}
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
