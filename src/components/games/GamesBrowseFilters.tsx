"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { controlLabelClass, fieldInputClass } from "@/components/ui/controls";
import type { BrowseSort, ReleaseStatus } from "@/lib/catalog";
import {
  ALL_YEARS_VALUE,
  BROWSE_RELEASE_OPTIONS,
  BROWSE_SORT_DIR_OPTIONS,
  BROWSE_SORT_OPTIONS,
  browseYearOptions,
} from "./browse-filters";

const fieldLabelClass = `block ${controlLabelClass}`;
const selectClass = "mt-1 w-[10.5rem]";

type Props = {
  q: string;
  year: number | undefined;
  sort: BrowseSort;
  sortDir: "asc" | "desc";
  releaseStatus: ReleaseStatus;
};

export function GamesBrowseFilters({
  q,
  year,
  sort,
  sortDir,
  releaseStatus,
}: Props) {
  const [yearValue, setYearValue] = useState(
    year != null ? String(year) : ALL_YEARS_VALUE,
  );
  const [sortValue, setSortValue] = useState(sort);
  const [sortDirValue, setSortDirValue] = useState(sortDir);
  const [releaseValue, setReleaseValue] = useState(releaseStatus);

  const years = browseYearOptions();
  if (year != null && !years.includes(year)) {
    years.push(year);
    years.sort((a, b) => b - a);
  }
  const yearOptions = [
    { value: ALL_YEARS_VALUE, label: "All years" },
    ...years.map((y) => ({ value: String(y), label: String(y) })),
  ];

  return (
    <form
      method="get"
      className="mt-8 flex flex-wrap items-end gap-4 border-y border-line py-5"
    >
      <label className={fieldLabelClass} htmlFor="games-q">
        Search
        <input
          id="games-q"
          name="q"
          defaultValue={q}
          className={`${fieldInputClass} min-w-[12rem]`}
          placeholder="Title"
        />
      </label>
      <div>
        <label htmlFor="games-year" className={fieldLabelClass}>
          Year
        </label>
        <Select
          id="games-year"
          name="year"
          value={yearValue}
          options={yearOptions}
          className={selectClass}
          aria-label="Year"
          onChange={setYearValue}
        />
      </div>
      <div>
        <label htmlFor="games-sort" className={fieldLabelClass}>
          Sort
        </label>
        <Select
          id="games-sort"
          name="sort"
          value={sortValue}
          options={BROWSE_SORT_OPTIONS}
          className={selectClass}
          aria-label="Sort"
          onChange={(next) => setSortValue(next as BrowseSort)}
        />
      </div>
      <div>
        <label htmlFor="games-sort-dir" className={fieldLabelClass}>
          Direction
        </label>
        <Select
          id="games-sort-dir"
          name="sortDir"
          value={sortDirValue}
          options={BROWSE_SORT_DIR_OPTIONS}
          className={selectClass}
          aria-label="Direction"
          onChange={(next) => setSortDirValue(next as "asc" | "desc")}
        />
      </div>
      <div>
        <label htmlFor="games-release" className={fieldLabelClass}>
          Release
        </label>
        <Select
          id="games-release"
          name="releaseStatus"
          value={releaseValue}
          options={BROWSE_RELEASE_OPTIONS}
          className={selectClass}
          aria-label="Release"
          onChange={(next) => setReleaseValue(next as ReleaseStatus)}
        />
      </div>
      <Button type="submit">Apply</Button>
    </form>
  );
}
