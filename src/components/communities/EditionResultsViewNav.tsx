"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EditionCategoryDebugBar } from "@/components/communities/EditionCategoryDebug";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import {
  editionResultsHref,
  editionHostSettingsHref,
} from "@/lib/communities/edition-results-href";
import {
  editionBoardLabel,
  parseEditionResultMode,
  parseEditionResultsView,
  type EditionResultsPublicMode,
  type EditionResultsViewId,
} from "@/lib/communities/edition-results-scoring";

export function EditionResultsViewNav({
  slug,
  year,
  hasYourBallot,
  canManage,
}: {
  slug: string;
  year: number;
  hasYourBallot: boolean;
  canManage: boolean;
}) {
  const sp = useSearchParams();
  const mode = parseEditionResultMode(sp.get("mode") ?? undefined);
  const view = parseEditionResultsView(sp.get("view") ?? undefined);
  const categoryId = sp.get("category")?.trim() || null;
  const votersPageRaw = Number(sp.get("votersPage") ?? "1");
  const votersPage =
    Number.isFinite(votersPageRaw) && votersPageRaw >= 1
      ? Math.floor(votersPageRaw)
      : 1;
  const votersQ = (sp.get("q") ?? "").trim();
  const voterUsername = (sp.get("voter") ?? "").trim();

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
  const viewingPublicBallot = view === "ballot" && voterUsername.length > 0;
  const viewingYourBallot =
    view === "ballot" && !viewingPublicBallot && hasYourBallot;
  const showBoardModes = view !== "ballot" && view !== "settings";
  const modes: EditionResultsPublicMode[] = ["community", "voices"];

  return (
    <div className="mt-6 border-b border-line pb-0">
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
              className={navItemClass("secondary", active)}
            >
              {v.label}
            </Link>
          );
        })}
      </ScrollableNav>

      {showBoardModes ? (
        <ScrollableNav
          aria-label="Results board"
          border={false}
          className="mt-3"
          rowClassName="items-center gap-x-2"
        >
          {modes.map((m, i) => (
            <span key={m} className="contents">
              {i > 0 ? (
                <span className="text-muted" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link
                href={editionResultsHref(slug, year, {
                  mode: m,
                  view,
                  votersPage: 1,
                  q: votersQ,
                  category:
                    view === "category" ? categoryId ?? undefined : undefined,
                })}
                className={navItemClass("tertiary", m === mode)}
              >
                {editionBoardLabel(m)}
              </Link>
            </span>
          ))}
          <EditionCategoryDebugBar />
        </ScrollableNav>
      ) : null}
    </div>
  );
}
