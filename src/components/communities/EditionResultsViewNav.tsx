import Link from "next/link";
import { EditionResultsBoardToolbar } from "@/components/communities/EditionResultsBoardToolbar";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import {
  editionHostSettingsHref,
  editionResultsHref,
} from "@/lib/communities/edition-results-href";
import type {
  EditionResultsPublicMode,
  EditionResultsViewId,
} from "@/lib/communities/edition-results-scoring";

export function EditionResultsViewNav({
  slug,
  year,
  mode,
  view,
  categoryId = null,
  votersPage = 1,
  votersQ = "",
  hasYourBallot,
  canManage,
  viewingPublicBallot = false,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  view: EditionResultsViewId;
  categoryId?: string | null;
  votersPage?: number;
  votersQ?: string;
  hasYourBallot: boolean;
  canManage: boolean;
  viewingPublicBallot?: boolean;
}) {
  const views: Array<{ id: EditionResultsViewId; label: string }> = [
    { id: "reveal", label: "Reveal" },
    { id: "overview", label: "Results" },
    { id: "standings", label: "Full standings" },
    { id: "categories", label: "Categories" },
    { id: "voters", label: "Voters" },
  ];
  if (hasYourBallot) {
    views.push({ id: "ballot", label: "Your ballot" });
  }
  if (canManage) {
    views.push({ id: "settings", label: "Settings" });
  }
  const viewingYourBallot = view === "ballot" && !viewingPublicBallot && hasYourBallot;
  const showBoardModes = view !== "ballot" && view !== "settings";

  return (
    <div className="mt-6">
      <div className="border-b border-line pb-0">
        <ScrollableNav aria-label="Results view" border={false}>
          {views.map((v) => {
            const active =
              v.id === "settings"
                ? view === "settings"
                : v.id === "ballot"
                  ? viewingYourBallot
                  : v.id === "voters"
                    ? view === "voters" || viewingPublicBallot
                    : v.id === "categories"
                      ? view === "categories" || view === "category"
                      : v.id === "overview"
                        ? (view === "overview" || view === "comparison") &&
                          !viewingPublicBallot
                        : v.id === view && !viewingPublicBallot;
            return (
              <Link
                key={v.id}
                href={
                  v.id === "settings"
                    ? editionHostSettingsHref(slug, year)
                    : editionResultsHref(slug, year, {
                        mode,
                        view: v.id,
                        votersPage,
                        q: votersQ,
                      })
                }
                scroll={false}
                className={navItemClass("secondary", active)}
              >
                {v.label}
              </Link>
            );
          })}
        </ScrollableNav>
      </div>

      {showBoardModes ? (
        <EditionResultsBoardToolbar
          slug={slug}
          year={year}
          mode={mode}
          view={view}
          categoryId={categoryId}
          votersQ={votersQ}
          showLayout={view === "overview" || view === "comparison"}
        />
      ) : null}
    </div>
  );
}
