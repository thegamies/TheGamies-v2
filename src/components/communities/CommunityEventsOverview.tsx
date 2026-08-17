import Link from "next/link";
import {
  EDITION_PUBLIC_LABEL,
  editionOverviewStatusLabel,
  editionOverviewStatusTime,
  editionOverviewTitle,
  type EditionSchedule,
  type EditionStatus,
} from "@/lib/communities/edition-status";

export function CommunityEventsOverview({
  slug,
  year,
  status,
  opensAt,
  closesAt,
  publishesAt,
}: {
  slug: string;
  year: number;
  status: EditionStatus;
  opensAt?: Date | null;
  closesAt?: Date | null;
  publishesAt?: Date | null;
}) {
  const href = `/communities/${encodeURIComponent(slug)}/edition/${year}`;
  const schedule: EditionSchedule = { opensAt, closesAt, publishesAt };
  const statusLabel = editionOverviewStatusLabel(status, schedule);
  const statusTime = editionOverviewStatusTime(status, schedule);

  return (
    <section>
      <h2 className="font-display text-3xl tracking-wide text-ink">
        {EDITION_PUBLIC_LABEL}
      </h2>
      <h3 className="mt-6 font-display text-2xl tracking-wide text-ink sm:text-3xl">
        <Link href={href} className="hover:text-accent">
          {editionOverviewTitle(year)}
        </Link>
      </h3>
      <p className="mt-2 text-sm font-extrabold tracking-[0.16em] text-muted">
        <span className="uppercase">Community vote</span>
        <span aria-hidden className="mx-1.5 font-normal tracking-normal">
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
          <span className="font-semibold tracking-wide">{statusLabel}</span>
        )}
      </p>
      <p className="mt-4">
        <Link
          href={href}
          className="inline-flex h-9 items-center justify-center border border-line px-3 text-sm font-semibold tracking-wide text-ink transition-[color,border-color] duration-[var(--motion-fast)] hover:border-accent"
        >
          Go to event
        </Link>
      </p>
    </section>
  );
}
