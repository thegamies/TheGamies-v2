import { Suspense } from "react";
import { EditionYearSelect } from "@/components/communities/EditionYearSelect";
import type {
  EditionSchedule,
  EditionStatus,
} from "@/lib/communities/edition-status";
import {
  editionDeckCopy,
  editionOverviewTitle,
  editionBallotCountCopy,
} from "@/lib/communities/edition-status";

type Props = {
  status: EditionStatus;
  slug: string;
  year: number;
  years: number[];
  opensAt?: Date | null;
  closesAt?: Date | null;
  publishesAt?: Date | null;
  ballotCount?: number | null;
};

/**
 * Events tab heading — same awards title as overview (`{year} Video Game Awards`).
 * Year select only when 2+ public years. No status jargon line.
 */
export function EditionSectionHeader({
  status,
  slug,
  year,
  years,
  opensAt,
  closesAt,
  publishesAt,
  ballotCount,
}: Props) {
  const title = editionOverviewTitle(year);
  const schedule: EditionSchedule = { opensAt, closesAt, publishesAt };
  const deck = editionDeckCopy(status, schedule);
  const showYearSelect = years.length > 1;

  return (
    <header>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="font-display text-4xl tracking-wide text-ink sm:text-5xl">
          {title}
        </h2>
        {showYearSelect ? (
          <Suspense fallback={null}>
            <EditionYearSelect slug={slug} year={year} years={years} />
          </Suspense>
        ) : null}
      </div>
      {deck ? (
        <p className="mt-3 max-w-xl font-serif text-lg leading-relaxed text-muted">
          {deck}
        </p>
      ) : null}
      {ballotCount != null ? (
        <p
          className={`${deck ? "mt-2" : "mt-3"} text-sm text-muted`}
        >
          {editionBallotCountCopy(ballotCount)}
        </p>
      ) : null}
    </header>
  );
}
