import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
import {
  editionHostHostsHref,
  editionHostPreviewHref,
  editionHostSettingsHref,
} from "@/lib/communities/edition-results-href";
import type { EditionSettingsPanelId } from "@/lib/communities/edition-results-scoring";

/** Tertiary tabs inside Event Settings. */
export function EditionSettingsTabs({
  slug,
  year,
  active,
  includePreview,
}: {
  slug: string;
  year: number;
  active: EditionSettingsPanelId;
  includePreview: boolean;
}) {
  return (
    <nav
      className="mt-6 flex flex-wrap gap-x-3 gap-y-1"
      aria-label="Event settings"
    >
      <Link
        href={editionHostSettingsHref(slug, year)}
        className={navItemClass("tertiary", active === "edition")}
      >
        Edition settings
      </Link>
      <span className="text-muted" aria-hidden>
        ·
      </span>
      <Link
        href={editionHostHostsHref(slug, year)}
        className={navItemClass("tertiary", active === "hosts")}
      >
        Manage hosts
      </Link>
      {includePreview ? (
        <>
          <span className="text-muted" aria-hidden>
            ·
          </span>
          <Link
            href={editionHostPreviewHref(slug, year)}
            className={navItemClass("tertiary", active === "preview")}
          >
            Host preview
          </Link>
        </>
      ) : null}
    </nav>
  );
}
