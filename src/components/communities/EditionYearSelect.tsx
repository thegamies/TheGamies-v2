"use client";

import { useSearchParams } from "next/navigation";
import { YearSelect } from "@/components/ui/YearSelect";
import { editionResultsHref } from "@/lib/communities/edition-results-href";
import {
  parseEditionResultMode,
  parseEditionResultsView,
} from "@/lib/communities/edition-results-scoring";

/**
 * Compact year switcher for edition pages — sits beside the section heading.
 * Links keep the current Results view and Community / Hosts board from the URL
 * so a persistent event layout does not wait on searchParams.
 */
export function EditionYearSelect({
  slug,
  year,
  years,
  alwaysShow = false,
}: {
  slug: string;
  year: number;
  years: number[];
  /** Show the year even when there is only one (no menu). */
  alwaysShow?: boolean;
}) {
  const sp = useSearchParams();
  const view = parseEditionResultsView(sp.get("view") ?? undefined);
  const mode = parseEditionResultMode(sp.get("mode") ?? undefined);
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
