import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
import {
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
  mode = "community",
}: {
  slug: string;
  year: number;
  canManage: boolean;
  active: "ballot" | "voters" | "settings";
  ballotLabel?: string;
  includeVoters?: boolean;
  mode?: EditionResultsPublicMode;
}) {
  if (!canManage && !includeVoters) return null;

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
