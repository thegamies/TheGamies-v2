import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import {
  editionHostRevealShowHref,
  editionHostSettingsHref,
  editionResultsHref,
} from "@/lib/communities/edition-results-href";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

export function EditionEventTabs({
  slug,
  year,
  canManage,
  active,
  ballotLabel = "Ballot",
  includeBallot = true,
  includeVoters = false,
  includeRevealShow = false,
  mode = "community",
}: {
  slug: string;
  year: number;
  canManage: boolean;
  active: "show" | "ballot" | "voters" | "settings";
  ballotLabel?: string;
  includeBallot?: boolean;
  includeVoters?: boolean;
  /** Closed + host: Results preview before Ballot. */
  includeRevealShow?: boolean;
  mode?: EditionResultsPublicMode;
}) {
  if (!canManage && !includeVoters && !includeRevealShow && !includeBallot) {
    return null;
  }

  const ballotHref = `/communities/${encodeURIComponent(slug)}/edition/${year}`;
  const votersHref = editionResultsHref(slug, year, {
    mode,
    view: "voters",
  });

  return (
    <ScrollableNav aria-label="Event view" className="mt-6">
      {includeRevealShow ? (
        <Link
          href={editionHostRevealShowHref(slug, year)}
          scroll={false}
          className={navItemClass("secondary", active === "show")}
        >
          Results preview
        </Link>
      ) : null}
      {includeBallot ? (
        <Link
          href={ballotHref}
          scroll={false}
          className={navItemClass("secondary", active === "ballot")}
        >
          {ballotLabel}
        </Link>
      ) : null}
      {includeVoters ? (
        <Link
          href={votersHref}
          scroll={false}
          className={navItemClass("secondary", active === "voters")}
        >
          Voters
        </Link>
      ) : null}
      {canManage ? (
        <Link
          href={editionHostSettingsHref(slug, year)}
          scroll={false}
          className={navItemClass("secondary", active === "settings")}
        >
          Settings
        </Link>
      ) : null}
    </ScrollableNav>
  );
}
