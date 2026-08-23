"use client";

import Link from "next/link";
import { EditionCategoryDebugPopover } from "@/components/communities/EditionCategoryDebug";
import {
  useEditionResultsLayout,
  type ResultsBoardLayout,
} from "@/components/communities/EditionResultsLayout";
import { controlGroupBarClass, segmentFitBtnClass } from "@/components/ui/controls";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import { editionResultsHref } from "@/lib/communities/edition-results-href";
import {
  editionBoardLabel,
  type EditionResultsPublicMode,
  type EditionResultsViewId,
} from "@/lib/communities/edition-results-scoring";

const LAYOUTS: Array<{ id: ResultsBoardLayout; label: string }> = [
  { id: "ranked", label: "Ranked" },
  { id: "comparison", label: "Comparison" },
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
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  view: EditionResultsViewId;
  categoryId?: string | null;
  votersQ?: string;
  showLayout: boolean;
}) {
  const board = useEditionResultsLayout();
  const showBoardMode = !(showLayout && board?.layout === "comparison");

  return (
    <ScrollableNav
      aria-label="Results board filters"
      border={false}
      align="center"
      className="mt-3"
      rowClassName="gap-2 [&>[role=group]]:shrink-0"
    >
      {showLayout && board ? (
        <div
          role="group"
          aria-label="Results layout"
          className={`${controlGroupBarClass} w-max shrink-0`}
        >
          {LAYOUTS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={board.layout === opt.id}
              className={segmentFitBtnClass(board.layout === opt.id)}
              onClick={() => board.setLayout(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {showBoardMode ? (
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
                  votersPage: 1,
                  q: votersQ,
                  category:
                    view === "category" ? categoryId ?? undefined : undefined,
                })}
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
