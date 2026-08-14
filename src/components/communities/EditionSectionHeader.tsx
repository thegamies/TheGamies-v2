import { EditionYearSelect } from "@/components/communities/EditionYearSelect";
import {
  editionDeckCopy,
  editionSectionTitle,
  type EditionStatus,
} from "@/lib/communities/edition-status";

type Props = {
  status: EditionStatus;
  slug: string;
  year: number;
  years: number[];
};

/**
 * Edition tab section heading — title + year select + one serif deck.
 * No status meta line; year is only in the year control when multiple years exist.
 */
export function EditionSectionHeader({ status, slug, year, years }: Props) {
  const title = editionSectionTitle(status);
  const deck = editionDeckCopy(status);
  const showYearAlone = years.length <= 1;

  return (
    <header>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="font-display text-4xl tracking-wide text-ink sm:text-5xl">
          {title}
        </h2>
        {showYearAlone ? (
          <p
            className="font-display text-2xl tracking-wide text-muted"
            aria-label={`${year} edition`}
          >
            {year}
          </p>
        ) : (
          <EditionYearSelect slug={slug} year={year} years={years} />
        )}
      </div>
      {deck ? (
        <p className="mt-3 max-w-xl font-serif text-lg leading-relaxed text-muted">
          {deck}
        </p>
      ) : null}
    </header>
  );
}
