"use client";

import Link from "next/link";
import { EditionCategoryDebugPopover } from "@/components/communities/EditionCategoryDebug";
import { controlGroupBarClass, segmentFitBtnClass } from "@/components/ui/controls";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import { editionResultsHref } from "@/lib/communities/edition-results-href";
import {
  editionBoardLabel,
  type EditionResultsPublicMode,
  type EditionResultsViewId,
  type EditionShowSource,
} from "@/lib/communities/edition-results-scoring";

const LAYOUTS: Array<{
  id: "ranked" | "comparison";
  view: "overview" | "comparison";
  label: string;
}> = [
  { id: "ranked", view: "overview", label: "Ranked" },
  { id: "comparison", view: "comparison", label: "Comparison" },
];

const MODES: EditionResultsPublicMode[] = ["community", "voices"];

export function EditionResultsBoardToolbar({
  slug,
  year,
  mode,
  view,
  categoryId = null,
  votersQ = "",
  showLayout,
  showBoardModes = true,
  source,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  view: EditionResultsViewId;
  categoryId?: string | null;
  votersQ?: string;
  showLayout: boolean;
  showBoardModes?: boolean;
  source?: EditionShowSource;
}) {
  const layoutActive = view === "comparison" ? "comparison" : "ranked";
  const showVoiceBoards = showBoardModes && view !== "comparison";

  return (
    <ScrollableNav
      aria-label="Results board filters"
      border={false}
      align="center"
      className="mt-3"
      rowClassName="gap-2 [&>[role=group]]:shrink-0"
    >
      {showLayout ? (
        <div
          role="group"
          aria-label="Results layout"
          className={`${controlGroupBarClass} w-max shrink-0`}
        >
          {LAYOUTS.map((opt) => {
            const active = layoutActive === opt.id;
            return (
              <Link
                key={opt.id}
                href={editionResultsHref(slug, year, {
                  mode,
                  view: opt.view,
                  source,
                  votersPage: 1,
                  q: votersQ,
                })}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={segmentFitBtnClass(active)}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      {showVoiceBoards ? (
        <div
          role="group"
          aria-label="Results board"
          className={`${controlGroupBarClass} w-max shrink-0`}
        >
          {MODES.map((m) => {
            const active = m === mode;
            return (
              <Link
                key={m}
                href={editionResultsHref(slug, year, {
                  mode: m,
                  view,
                  source,
                  votersPage: 1,
                  q: votersQ,
                  category:
                    view === "category" ? categoryId ?? undefined : undefined,
                })}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={segmentFitBtnClass(active)}
              >
                {editionBoardLabel(m)}
              </Link>
            );
          })}
        </div>
      ) : null}

      <EditionCategoryDebugPopover />
    </ScrollableNav>
  );
}
