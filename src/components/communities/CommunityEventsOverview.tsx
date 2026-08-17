import Link from "next/link";
import {
  EDITION_PUBLIC_LABEL,
  editionOverviewStatusLabel,
  editionOverviewStatusTime,
  editionOverviewTitle,
  type EditionSchedule,
  type EditionStatus,
} from "@/lib/communities/edition-status";

export type CommunityEventsOverviewItem = {
  year: number;
  status: EditionStatus;
  opensAt?: Date | null;
  closesAt?: Date | null;
  publishesAt?: Date | null;
};

export function CommunityEventsOverview({
  slug,
  editions,
}: {
  slug: string;
  editions: CommunityEventsOverviewItem[];
}) {
  if (editions.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-3xl tracking-wide text-ink">
        {EDITION_PUBLIC_LABEL}
      </h2>
      <ul className="mt-6 divide-y divide-line border-t border-line">
        {editions.map((edition) => {
          const href = `/communities/${encodeURIComponent(slug)}/edition/${edition.year}`;
          const schedule: EditionSchedule = {
            opensAt: edition.opensAt,
            closesAt: edition.closesAt,
            publishesAt: edition.publishesAt,
          };
          const statusLabel = editionOverviewStatusLabel(
            edition.status,
            schedule,
          );
          const statusTime = editionOverviewStatusTime(
            edition.status,
            schedule,
          );

          return (
            <li
              key={edition.year}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-5 last:pb-0"
            >
              <div className="min-w-0">
                <h3 className="font-display text-2xl tracking-wide text-ink sm:text-3xl">
                  <Link href={href} className="hover:text-accent">
                    {editionOverviewTitle(edition.year)}
                  </Link>
                </h3>
                <p className="mt-2 text-sm font-extrabold tracking-[0.16em] text-muted">
                  <span className="uppercase">Community vote</span>
                  <span
                    aria-hidden
                    className="mx-1.5 font-normal tracking-normal"
                  >
                    ·
                  </span>
                  {statusTime ? (
                    <time
                      className="font-semibold tracking-normal"
                      dateTime={statusTime.toISOString()}
                    >
                      {statusLabel}
                    </time>
                  ) : (
                    <span className="font-semibold tracking-wide">
                      {statusLabel}
                    </span>
                  )}
                </p>
              </div>
              <Link
                href={href}
                className="inline-flex h-9 shrink-0 items-center justify-center border border-line px-3 text-sm font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
              >
                Go to event
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
