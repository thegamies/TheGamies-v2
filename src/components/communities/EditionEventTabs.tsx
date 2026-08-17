import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
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
  includeVoters = false,
  includeRevealShow = false,
  mode = "community",
}: {
  slug: string;
  year: number;
  canManage: boolean;
  active: "show" | "ballot" | "voters" | "settings";
  ballotLabel?: string;
  includeVoters?: boolean;
  /** Closed + host: Results preview before Ballot. */
  includeRevealShow?: boolean;
  mode?: EditionResultsPublicMode;
}) {
  if (!canManage && !includeVoters && !includeRevealShow) return null;

  const ballotHref = `/communities/${encodeURIComponent(slug)}/edition/${year}`;
  const votersHref = editionResultsHref(slug, year, {
    mode,
    view: "voters",
  });

  return (
    <nav
      className="mt-6 flex flex-wrap gap-5 border-b border-line"
      aria-label="Event view"
    >
      {includeRevealShow ? (
        <Link
          href={editionHostRevealShowHref(slug, year)}
          className={navItemClass("secondary", active === "show")}
        >
          Results preview
        </Link>
      ) : null}
      <Link
        href={ballotHref}
        className={navItemClass("secondary", active === "ballot")}
      >
        {ballotLabel}
      </Link>
      {includeVoters ? (
        <Link
          href={votersHref}
          className={navItemClass("secondary", active === "voters")}
        >
          Voters
        </Link>
      ) : null}
      {canManage ? (
        <Link
          href={editionHostSettingsHref(slug, year)}
          className={navItemClass("secondary", active === "settings")}
        >
          Settings
        </Link>
      ) : null}
    </nav>
  );
}
