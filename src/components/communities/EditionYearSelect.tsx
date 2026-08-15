"use client";

import { YearSelect } from "@/components/ui/YearSelect";
import { communitySettingsHref } from "@/lib/communities/community-settings-href";
import { editionResultsHref } from "@/lib/communities/edition-results-href";
import type {
  EditionResultsPublicMode,
  EditionResultsViewId,
} from "@/lib/communities/edition-results-scoring";

type Props = {
  slug: string;
  year: number;
  years: number[];
  view?: EditionResultsViewId;
  mode?: EditionResultsPublicMode;
  /** Settings Events stays on community settings; default is the event page. */
  links?: "results" | "settings";
  /** Show the year even when there is only one (no menu). */
  alwaysShow?: boolean;
};

/**
 * Compact year switcher for edition pages — sits beside the section heading.
 * Public Events: only when 2+ years. Community Settings: alwaysShow.
 * Default links keep the current view and Community / Hosts board.
 */
export function EditionYearSelect({
  slug,
  year,
  years,
  view = "reveal",
  mode = "community",
  links = "results",
  alwaysShow = false,
}: Props) {
  const options = years.map((y) => ({
    year: y,
    href:
      links === "settings"
        ? communitySettingsHref(slug, { tab: "events", year: y })
        : editionResultsHref(slug, y, { view, mode }),
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
