"use client";

import { YearSelect } from "@/components/ui/YearSelect";
import { editionResultsHref } from "@/lib/communities/edition-results-href";
import type {
  EditionResultsPublicMode,
  EditionResultsViewId,
} from "@/lib/communities/edition-results-scoring";

/**
 * Compact year switcher for edition pages — sits beside the section heading.
 * Public Events: only when 2+ years. Default links keep the current view and
 * Community / Hosts board.
 */
export function EditionYearSelect({
  slug,
  year,
  years,
  view = "reveal",
  mode = "community",
  alwaysShow = false,
}: {
  slug: string;
  year: number;
  years: number[];
  view?: EditionResultsViewId;
  mode?: EditionResultsPublicMode;
  /** Show the year even when there is only one (no menu). */
  alwaysShow?: boolean;
}) {
  const options = years.map((y) => ({
    year: y,
    href: editionResultsHref(slug, y, { view, mode }),
  }));

  return (
    <YearSelect
      year={year}
      options={options}
      alwaysShow={alwaysShow}
      label="Event year"
    />
  );
}
