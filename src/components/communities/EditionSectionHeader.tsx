import { EditionYearSelect } from "@/components/communities/EditionYearSelect";
import type {
  EditionResultsPublicMode,
  EditionResultsViewId,
} from "@/lib/communities/edition-results-scoring";
import {
  editionDeckCopy,
  editionOverviewTitle,
  editionBallotCountCopy,
  type EditionSchedule,
  type EditionStatus,
} from "@/lib/communities/edition-status";

type Props = {
  status: EditionStatus;
  slug: string;
  year: number;
  years: number[];
  view?: EditionResultsViewId;
  mode?: EditionResultsPublicMode;
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
  view,
  mode,
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
          <EditionYearSelect
            slug={slug}
            year={year}
            years={years}
            view={view}
            mode={mode}
          />
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
